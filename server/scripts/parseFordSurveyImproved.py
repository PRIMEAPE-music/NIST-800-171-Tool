import json
import os
import re
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString
from datetime import datetime

# Configuration
UPLOAD_DIR = Path(__file__).parent.parent.parent / 'uploads'
OUTPUT_FILE = Path(__file__).parent.parent / 'data' / 'ford-survey-parsed.json'

# Section files to parse
SECTION_FILES = [
    'Section A.htm',
    'Section B.htm',
    'Section C.htm',
    'Section D.htm',
    'Section E.htm',
    'Section F.htm',
    'Section G.htm',
    'Section H.htm',
    'Section I.htm',
    'Section J.htm',
    'Section K.htm',
    'Section N.htm',
    'Section T.htm',
    'Section V.htm'
]

def extract_text_preserving_structure(element):
    """Extract text from HTML element preserving some structure"""
    if element is None:
        return []

    text_blocks = []
    for item in element.descendants:
        if isinstance(item, NavigableString):
            text = str(item).strip()
            if text and text not in text_blocks:
                text_blocks.append(text)
    return text_blocks

def parse_html_file(file_path):
    """Parse a single HTML file and extract section data"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html = f.read()

        soup = BeautifulSoup(html, 'html.parser')

        # Extract section title from h1
        h1 = soup.find('h1')
        if not h1:
            print(f"  X No h1 tag found in {file_path}")
            return None

        title_text = h1.get_text(strip=True)

        # Parse title
        match = re.search(r'Section ([A-Z]):\s*(.+?)\s*-\s*\((.+?)\)', title_text)
        if not match:
            match = re.search(r'Section ([A-Z])\s*-\s*(.+?)\s*-\s*\((.+?)\)', title_text)
        if not match:
            match = re.search(r'Section ([A-Z])[:\s-]+(.+)', title_text)
            if match:
                section_id = match.group(1)
                section_name = match.group(2).strip()
                section_name = re.sub(r'\s*-\s*\(.+?\)\s*$', '', section_name)
                risk_level = None
            else:
                print(f"  X Could not parse title: {title_text}")
                return None
        else:
            section_id = match.group(1)
            section_name = match.group(2).strip()
            risk_level = match.group(3).strip()

        # Find questions using a more robust approach
        questions = []

        # Get full body text with better preservation
        body_text = soup.get_text(separator='\n')

        # Split into lines and clean
        all_lines = []
        for line in body_text.split('\n'):
            stripped = line.strip()
            if stripped:
                all_lines.append(stripped)

        # Find question patterns: lines that contain "X.N" where X is section letter
        question_pattern = re.compile(rf'^.*?{section_id}\.(\d+)\s+(.+)$')

        i = 0
        while i < len(all_lines):
            line = all_lines[i]

            # Check if this line contains a question ID
            q_match = question_pattern.match(line)
            if q_match:
                question_num = q_match.group(1)
                question_id = f"{section_id}.{question_num}"

                # Extract question text - it's usually on the next few lines
                question_text_lines = []
                help_text = None
                options = []
                answered_by = None
                answered_date = None
                comments = None
                selected_option = None

                # Look ahead for question text
                j = i + 1
                collecting_question = True
                collecting_options = False

                while j < len(all_lines) and j < i + 50:  # Look ahead up to 50 lines
                    next_line = all_lines[j]

                    # Stop if we hit another question
                    if question_pattern.match(next_line):
                        break

                    # Check for Help Text
                    if next_line == 'Help Text':
                        collecting_question = False
                        if j + 1 < len(all_lines):
                            potential_help = all_lines[j + 1]
                            # Help text is usually before "Please select"
                            if 'Please select' not in potential_help and len(potential_help) < 500:
                                help_text = potential_help
                                j += 1
                        j += 1
                        continue

                    # Check for options section
                    if 'Please select' in next_line and 'following options' in next_line:
                        collecting_question = False
                        collecting_options = True
                        j += 1
                        continue

                    # Collect options
                    if collecting_options:
                        # Options usually start with Yes/No or specific patterns
                        if next_line.startswith('Yes,') or next_line.startswith('No,'):
                            options.append(next_line)
                        elif next_line == 'Not applicable':
                            options.append(next_line)
                        elif next_line in ['Show possible answers', 'Answered by:', 'Date:', 'Comments', 'Data Location:']:
                            collecting_options = False
                        j += 1
                        continue

                    # Check for answered by
                    if 'Answered by:' in next_line:
                        collecting_question = False
                        # Extract name after "Answered by:"
                        answered_match = re.search(r'Answered by:\s*([^0-9\n]+)', next_line)
                        if answered_match:
                            answered_by = answered_match.group(1).strip()
                        j += 1
                        continue

                    # Check for date
                    if 'Date:' in next_line or re.search(r'\d{2}/\d{2}/\d{4}', next_line):
                        date_match = re.search(r'(\d{2}/\d{2}/\d{4})', next_line)
                        if date_match:
                            answered_date = date_match.group(1)
                        j += 1
                        continue

                    # Check for comments
                    if next_line == 'Comments':
                        if j + 1 < len(all_lines):
                            potential_comment = all_lines[j + 1]
                            if potential_comment not in ['Data Location:', 'Terms of Use']:
                                comments = potential_comment
                                j += 1
                        j += 1
                        continue

                    # Check for data location (end of question)
                    if next_line.startswith('Data Location:'):
                        break

                    # Collect question text
                    if collecting_question:
                        # Skip certain metadata lines
                        if next_line not in ['Help Text', 'Comments', 'Data Location:', 'Show possible answers']:
                            # Check if line ends a question (ends with ?)
                            if '?' in next_line:
                                question_text_lines.append(next_line)
                                collecting_question = False
                            else:
                                question_text_lines.append(next_line)

                    j += 1

                # Build the question object
                question_text = ' '.join(question_text_lines).strip()

                # If we didn't find question text, try to extract it from the initial line
                if not question_text:
                    # The question might be on line i+1
                    if i + 1 < len(all_lines):
                        question_text = all_lines[i + 1]

                questions.append({
                    'questionId': question_id,
                    'questionText': question_text if question_text else 'Question text not found',
                    'helpText': help_text,
                    'answerType': 'single-choice',
                    'options': options,
                    'givenAnswer': {
                        'selectedOption': selected_option,
                        'comments': comments,
                        'answeredBy': answered_by,
                        'answeredDate': answered_date
                    }
                })

                # Move past this question
                i = j
                continue

            i += 1

        return {
            'sectionId': section_id,
            'sectionName': section_name,
            'riskLevel': risk_level,
            'questions': questions
        }

    except Exception as e:
        print(f"  X Error parsing {file_path}: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    print('Starting Ford Survey HTML parsing (Improved)...\n')
    print(f'Looking for files in: {UPLOAD_DIR}\n')

    if not UPLOAD_DIR.exists():
        print(f'ERROR: Upload directory not found: {UPLOAD_DIR}')
        return

    sections = []

    for file_name in SECTION_FILES:
        file_path = UPLOAD_DIR / file_name

        if not file_path.exists():
            print(f'File not found: {file_path}')
            continue

        print(f'Parsing {file_name}...')
        section = parse_html_file(file_path)

        if section:
            sections.append(section)
            answered_count = sum(1 for q in section['questions']
                               if q['givenAnswer']['selectedOption'] or
                                  q['givenAnswer']['comments'] or
                                  q['givenAnswer']['answeredBy'])
            print(f"  OK Extracted {len(section['questions'])} questions ({answered_count} answered)")
        else:
            print(f'  X Failed to parse {file_name}')

    if not sections:
        print('\nERROR: No sections were parsed successfully!')
        return

    sections.sort(key=lambda x: x['sectionId'])

    survey = {
        'surveyId': 'ford-sig-lite-2024',
        'surveyName': 'Ford SIG Lite 2024',
        'surveyDescription': 'Standardized Information Gathering (SIG) Lite questionnaire for cybersecurity assessment',
        'createdDate': datetime.now().strftime('%Y-%m-%d'),
        'sections': sections
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(survey, f, indent=2, ensure_ascii=False)

    total_questions = sum(len(s['questions']) for s in sections)
    print(f'\nOK Successfully parsed {len(sections)} sections')
    print(f'OK Total questions: {total_questions}')
    print(f'OK Output saved to: {OUTPUT_FILE}\n')

    print('Summary by section:')
    for section in sections:
        answered_count = sum(1 for q in section['questions']
                           if q['givenAnswer']['selectedOption'] or
                              q['givenAnswer']['comments'] or
                              q['givenAnswer']['answeredBy'])
        print(f"  Section {section['sectionId']}: {len(section['questions'])} questions ({answered_count} answered)")

if __name__ == '__main__':
    main()

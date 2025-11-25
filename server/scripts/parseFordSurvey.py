import json
import os
import re
from pathlib import Path
from bs4 import BeautifulSoup
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

        # Parse title: Try multiple patterns
        # Pattern 1: "SIG Lite 2024 - Section A: Enterprise Risk Management - (High Availability)"
        # Pattern 2: "SIG Lite 2022 Section C - Organizational Security - (Enhanced)"

        match = re.search(r'Section ([A-Z]):\s*(.+?)\s*-\s*\((.+?)\)', title_text)
        if not match:
            # Try pattern 2: "Section X - Title - (Risk Level)"
            match = re.search(r'Section ([A-Z])\s*-\s*(.+?)\s*-\s*\((.+?)\)', title_text)
        if not match:
            # Try without risk level
            match = re.search(r'Section ([A-Z])[:\s-]+(.+)', title_text)
            if match:
                section_id = match.group(1)
                section_name = match.group(2).strip()
                # Remove trailing parens if any
                section_name = re.sub(r'\s*-\s*\(.+?\)\s*$', '', section_name)
                risk_level = None
            else:
                print(f"  X Could not parse title: {title_text}")
                return None
        else:
            section_id = match.group(1)
            section_name = match.group(2).strip()
            risk_level = match.group(3).strip()

        # Find all questions
        questions = []

        # Get all text content for parsing
        body_text = soup.get_text(separator='\n')
        lines = [line.strip() for line in body_text.split('\n') if line.strip()]

        # Parse questions from text
        current_question = None
        collecting_options = False
        i = 0

        while i < len(lines):
            line = lines[i]

            # Detect question ID (e.g., "A.1" or "1. A.1")
            q_match = re.match(r'^(?:\d+\.\s*)?([A-Z])\.(\d+)$', line)
            if q_match:
                # Save previous question
                if current_question and current_question.get('questionId'):
                    questions.append(current_question)

                # Start new question
                question_id = f"{q_match.group(1)}.{q_match.group(2)}"
                current_question = {
                    'questionId': question_id,
                    'questionText': '',
                    'helpText': None,
                    'answerType': 'single-choice',
                    'options': [],
                    'givenAnswer': {
                        'selectedOption': None,
                        'comments': None,
                        'answeredBy': None,
                        'answeredDate': None
                    }
                }

                # Next line(s) should be question text
                i += 1
                if i < len(lines):
                    # Collect question text until we hit help text, options, or answer metadata
                    question_lines = []
                    while i < len(lines):
                        next_line = lines[i]
                        if (next_line in ['Help Text', 'Please select', 'Show possible answers', 'Answered by:'] or
                            next_line.startswith('Answered by:') or
                            next_line.startswith('Date:') or
                            re.match(r'^(?:\d+\.\s*)?[A-Z]\.\d+$', next_line)):
                            break
                        question_lines.append(next_line)
                        i += 1
                    current_question['questionText'] = ' '.join(question_lines).strip()
                continue

            # Detect help text
            if line == 'Help Text' and current_question:
                i += 1
                if i < len(lines) and lines[i] not in ['Please select', 'Show possible answers']:
                    current_question['helpText'] = lines[i]
                    i += 1
                continue

            # Detect answer options
            if 'Please select' in line and 'following options' in line:
                collecting_options = True
                i += 1
                continue

            # Collect options
            if collecting_options and current_question:
                if line.startswith('Yes,') or line.startswith('No,') or line == 'Not applicable':
                    current_question['options'].append(line)
                elif line in ['Show possible answers', 'Answered by:'] or line.startswith('Answered by:'):
                    collecting_options = False
                    continue
                i += 1
                continue

            # Detect answered by
            if line.startswith('Answered by:') and current_question:
                answered_by = line.replace('Answered by:', '').strip()
                if not answered_by and i + 1 < len(lines):
                    i += 1
                    answered_by = lines[i].strip()
                current_question['givenAnswer']['answeredBy'] = answered_by if answered_by else None
                i += 1
                continue

            # Detect date
            if line.startswith('Date:') and current_question:
                date_str = line.replace('Date:', '').strip()
                current_question['givenAnswer']['answeredDate'] = date_str if date_str else None
                i += 1
                continue

            # Detect comments
            if line == 'Comments' and current_question:
                i += 1
                if i < len(lines) and lines[i] not in ['Data Location:', 'Answered by:']:
                    current_question['givenAnswer']['comments'] = lines[i]
                    i += 1
                continue

            # Try to detect selected answer by matching option text
            if current_question and current_question['options']:
                for option in current_question['options']:
                    # Check if the line contains the option text (partial match)
                    if len(option) > 20 and option[:20] in line:
                        current_question['givenAnswer']['selectedOption'] = option
                        break

            i += 1

        # Save last question
        if current_question and current_question.get('questionId'):
            questions.append(current_question)

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
    print('Starting Ford Survey HTML parsing...\n')
    print(f'Looking for files in: {UPLOAD_DIR}\n')

    # Check if upload directory exists
    if not UPLOAD_DIR.exists():
        print(f'ERROR: Upload directory not found: {UPLOAD_DIR}')
        print('\nPlease create the directory and add your Section HTML files there.')
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

    # Sort sections by ID
    sections.sort(key=lambda x: x['sectionId'])

    # Create survey object
    survey = {
        'surveyId': 'ford-sig-lite-2024',
        'surveyName': 'Ford SIG Lite 2024',
        'surveyDescription': 'Standardized Information Gathering (SIG) Lite questionnaire for cybersecurity assessment',
        'createdDate': datetime.now().strftime('%Y-%m-%d'),
        'sections': sections
    }

    # Ensure output directory exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Write to file
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(survey, f, indent=2, ensure_ascii=False)

    total_questions = sum(len(s['questions']) for s in sections)
    print(f'\nOK Successfully parsed {len(sections)} sections')
    print(f'OK Total questions: {total_questions}')
    print(f'OK Output saved to: {OUTPUT_FILE}\n')

    # Display summary
    print('Summary by section:')
    for section in sections:
        answered_count = sum(1 for q in section['questions']
                           if q['givenAnswer']['selectedOption'] or
                              q['givenAnswer']['comments'] or
                              q['givenAnswer']['answeredBy'])
        print(f"  Section {section['sectionId']}: {len(section['questions'])} questions ({answered_count} answered)")

if __name__ == '__main__':
    main()

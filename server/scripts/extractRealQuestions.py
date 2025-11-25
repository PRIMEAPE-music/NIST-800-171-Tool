import json
import re
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime

UPLOAD_DIR = Path(__file__).parent.parent.parent / 'uploads'
OUTPUT_FILE = Path(__file__).parent.parent / 'data' / 'ford-survey-real.json'

def extract_questions_from_section(file_path, section_id):
    """Manually extract questions with careful parsing"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html = f.read()

        soup = BeautifulSoup(html, 'html.parser')
        text = soup.get_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        # Get section title
        h1 = soup.find('h1')
        title_text = h1.get_text(strip=True) if h1 else ""

        # Parse title
        match = re.search(r'Section ([A-Z]):\s*(.+?)\s*-\s*\((.+?)\)', title_text)
        if not match:
            match = re.search(r'Section ([A-Z])\s*-\s*(.+?)\s*-\s*\((.+?)\)', title_text)

        if match:
            section_name = match.group(2).strip()
            risk_level = match.group(3).strip()
        else:
            section_name = "Unknown"
            risk_level = None

        questions = []
        i = 0

        while i < len(lines):
            line = lines[i]

            # Look for question pattern: "X.N" where X is section letter
            q_pattern = rf'{section_id}\.(\d+)'
            if re.search(q_pattern, line):
                # Extract question number
                q_match = re.search(rf'{section_id}\.(\d+)', line)
                if q_match:
                    q_num = q_match.group(1)
                    question_id = f"{section_id}.{q_num}"

                    # Extract metadata from this line
                    answered_by = None
                    answered_date = None

                    if 'Answered by:' in line:
                        ans_match = re.search(r'Answered by:\s*([^\d]+)', line)
                        if ans_match:
                            answered_by = ans_match.group(1).strip()

                    if 'Date:' in line:
                        date_match = re.search(r'(\d{2}/\d{2}/\d{4})', line)
                        if date_match:
                            answered_date = date_match.group(1)

                    # Look for question text in next few lines
                    question_text = ""
                    help_text = None
                    options = []

                    j = i + 1
                    collecting_question = True
                    collecting_options = False

                    while j < len(lines) and j < i + 30:
                        next_line = lines[j]

                        # Stop if we hit another question
                        if re.search(rf'{section_id}\.\d+', next_line) and j > i + 2:
                            break

                        # Check for question text ending (usually ends with ?)
                        if collecting_question:
                            # Remove "Help Text" if concatenated
                            if 'Help Text' in next_line:
                                parts = next_line.split('Help Text')
                                if parts[0].strip():
                                    question_text += ' ' + parts[0].strip()
                                collecting_question = False
                                # Check if there's help text after
                                if len(parts) > 1 and parts[1].strip() and 'Please select' not in parts[1]:
                                    help_text = parts[1].strip()
                                j += 1
                                continue

                            # Check for "Please select" which ends question
                            if 'Please select' in next_line:
                                parts = next_line.split('Please select')
                                if parts[0].strip():
                                    question_text += ' ' + parts[0].strip()
                                collecting_question = False
                                collecting_options = True
                                j += 1
                                continue

                            # Otherwise collect as question text
                            if next_line and not next_line.startswith('Data Location'):
                                question_text += ' ' + next_line
                                if '?' in next_line:
                                    collecting_question = False

                        # Collect options
                        if 'Please select' in next_line or collecting_options:
                            collecting_options = True

                            # Extract options that typically start with Yes/No
                            yes_match = re.findall(r'(Yes,[^N]+(?:requirements|program|policy|plan|controls?|procedures?|processes?))', next_line)
                            no_match = re.findall(r'(No,[^N]+(?:requirements|program|policy|plan|controls?|procedures?|processes?))', next_line)

                            for opt in yes_match:
                                if opt not in options:
                                    options.append(opt.strip())
                            for opt in no_match:
                                if opt not in options:
                                    options.append(opt.strip())

                            if 'Not applicable' in next_line and 'Not applicable' not in options:
                                options.append('Not applicable')

                            if 'Show possible answers' in next_line or 'Comments' in next_line:
                                collecting_options = False
                                break

                        j += 1

                    # Clean up question text
                    question_text = question_text.strip()
                    question_text = re.sub(r'\s+', ' ', question_text)

                    if question_text and not question_text.startswith('Data Location'):
                        questions.append({
                            'questionId': question_id,
                            'questionText': question_text,
                            'helpText': help_text,
                            'answerType': 'single-choice',
                            'options': options if options else [],
                            'givenAnswer': {
                                'selectedOption': None,  # We'll need to determine this separately
                                'comments': None,
                                'answeredBy': answered_by,
                                'answeredDate': answered_date
                            }
                        })

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
        print(f"Error processing {file_path}: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    print("Manually extracting real survey questions...\n")

    sections_to_extract = [
        ('Section A.htm', 'A'),
        ('Section B.htm', 'B'),
        ('Section C.htm', 'C'),
        ('Section D.htm', 'D'),
        ('Section E.htm', 'E'),
        ('Section F.htm', 'F'),
        ('Section G.htm', 'G'),
        ('Section H.htm', 'H'),
        ('Section I.htm', 'I'),
        ('Section J.htm', 'J'),
        ('Section K.htm', 'K'),
        ('Section N.htm', 'N'),
        ('Section N (page 2).htm', 'N'),  # Page 2 of N
        ('Section T.htm', 'T'),
        ('Section V.htm', 'V'),
    ]

    all_sections = {}

    for filename, section_id in sections_to_extract:
        file_path = UPLOAD_DIR / filename
        if not file_path.exists():
            print(f"File not found: {filename}")
            continue

        print(f"Processing {filename}...")
        section_data = extract_questions_from_section(file_path, section_id)

        if section_data:
            # Merge if section already exists (for multi-page sections like N)
            if section_id in all_sections:
                all_sections[section_id]['questions'].extend(section_data['questions'])
                print(f"  Added {len(section_data['questions'])} more questions to Section {section_id}")
            else:
                all_sections[section_id] = section_data
                print(f"  Extracted {len(section_data['questions'])} questions")

    # Convert to list and sort
    sections_list = sorted(all_sections.values(), key=lambda x: x['sectionId'])

    survey = {
        'surveyId': 'ford-sig-lite-2024',
        'surveyName': 'Ford SIG Lite 2024',
        'surveyDescription': 'Standardized Information Gathering (SIG) Lite questionnaire for cybersecurity assessment',
        'createdDate': '2024-07-12',
        'sections': sections_list
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(survey, f, indent=2, ensure_ascii=False)

    total_questions = sum(len(s['questions']) for s in sections_list)
    print(f"\nOK Successfully extracted {len(sections_list)} sections")
    print(f"OK Total questions: {total_questions}")
    print(f"OK Output saved to: {OUTPUT_FILE}\n")

    print("Summary by section:")
    for section in sections_list:
        print(f"  Section {section['sectionId']}: {len(section['questions'])} questions")

if __name__ == '__main__':
    main()

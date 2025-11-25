import json
import re
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime

UPLOAD_DIR = Path(r'C:\Users\justin\Desktop\IT Software\Custom Programs\NIST Tool\uploads\Ford 2024 High Availability (ROC) Survey')
OUTPUT_FILE = Path(__file__).parent.parent / 'data' / 'ford-survey-2024-real.json'

def extract_questions_from_section(file_path, section_id):
    """Extract questions with scoring data"""
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

            # Look for question pattern with scoring
            # Updated regex to handle alphanumeric IDs like U.2F, N.13.1F, etc.
            if re.search(rf'{section_id}\.[\dA-Z.]+', line):
                q_match = re.search(rf'{section_id}\.([\dA-Z.]+)', line)
                if q_match:
                    q_num = q_match.group(1)
                    question_id = f"{section_id}.{q_num}"

                    # Extract selected answer from the same line (appears after question ID)
                    # Pattern: "A.1 Selected answer text here..." or "U.2F Selected answer..."
                    selected_option = None
                    answer_match = re.search(rf'{section_id}\.{re.escape(q_num)}\s+(.+?)(?:Answered by:|$)', line)
                    if answer_match:
                        potential_answer = answer_match.group(1).strip()
                        # Only use if it's not just the question text starting
                        if not potential_answer.startswith(('Is there', 'Does', 'Has', 'Have', 'Are', 'Do', 'Will')):
                            selected_option = potential_answer

                    # Extract metadata from this line
                    answered_by = None
                    answered_date = None
                    likelihood = None
                    overall_impact = None

                    if 'Answered by:' in line:
                        ans_match = re.search(r'Answered by:\s*([A-Za-z\s]+?)(?:Date:|$)', line)
                        if ans_match:
                            answered_by = ans_match.group(1).strip()

                    if 'Date:' in line:
                        date_match = re.search(r'Date:\s*(\d{2}/\d{2}/\d{4})', line)
                        if date_match:
                            answered_date = date_match.group(1)

                    # Look ahead for scoring (usually near the end of question)
                    scoring_search_range = min(i + 50, len(lines))
                    for j in range(i, scoring_search_range):
                        score_line = lines[j]
                        if 'Likelihood:' in score_line and 'impact:' in score_line:
                            score_match = re.search(r'Likelihood:\s*(\d+),\s*Overall impact:\s*(\d+)', score_line)
                            if score_match:
                                likelihood = int(score_match.group(1))
                                overall_impact = int(score_match.group(2))
                                break

                    # Look for question text - check current line first (single-line format)
                    question_text = ""
                    help_text = None
                    options = []
                    comments = None
                    # selected_option already extracted above from the question ID line

                    # Check if question text is on the SAME line (single-line format)
                    # Pattern: "P.4F [answer] Answered by: X Date: Y 1. P.4F [question text]"
                    same_line_q_match = re.search(rf'\d+\.\s+{section_id}\.{re.escape(q_num)}\s+(.+?)(?:Help Text|$)', line)
                    if same_line_q_match:
                        # Single-line format - extract everything from current line
                        question_text = same_line_q_match.group(1).strip()
                        # Extract help text from same line
                        if 'Help Text' in line:
                            help_parts = line.split('Help Text', 1)
                            if len(help_parts) > 1:
                                remaining = help_parts[1]
                                if 'Please select' in remaining:
                                    help_text = remaining.split('Please select')[0].strip()
                        # Extract options from same line
                        if 'Yes,' in line:
                            yes_match = re.search(r'(Yes,[^N]+?)(?=No,|Not applicable|Show possible)', line)
                            if yes_match:
                                options.append(yes_match.group(1).strip())
                        if 'No,' in line:
                            no_match = re.search(r'(No,[^N]+?)(?=Not applicable|Show possible|Comments)', line)
                            if no_match:
                                options.append(no_match.group(1).strip())
                        if 'Not applicable' in line:
                            options.append('Not applicable')

                        # Add the question to the list
                        if question_text:
                            questions.append({
                                'questionId': question_id,
                                'questionText': question_text,
                                'helpText': help_text,
                                'answerType': 'single-choice',
                                'options': options if options else [],
                                'scoring': {
                                    'likelihood': likelihood,
                                    'overallImpact': overall_impact
                                },
                                'givenAnswer': {
                                    'selectedOption': selected_option,
                                    'comments': comments,
                                    'answeredBy': answered_by,
                                    'answeredDate': answered_date
                                }
                            })

                        i += 1
                        continue  # Skip to next question

                    # Multi-line format - look at subsequent lines
                    j = i + 1
                    collecting_question = True
                    collecting_options = False
                    collecting_comments = False

                    while j < len(lines) and j < i + 40:
                        next_line = lines[j]

                        # Stop if we hit another question
                        if re.search(rf'{section_id}\.[\dA-Z.]+', next_line) and j > i + 2:
                            break

                        # Stop at certain markers
                        if next_line.startswith('Data Location:') or next_line.startswith('Create a new task'):
                            break

                        # Extract question text
                        if collecting_question:
                            if 'Help Text' in next_line:
                                parts = next_line.split('Help Text')
                                if parts[0].strip():
                                    question_text += ' ' + parts[0].strip()
                                collecting_question = False
                                if len(parts) > 1 and parts[1].strip():
                                    remaining = parts[1].strip()
                                    if not remaining.startswith('Please select'):
                                        help_text = remaining.split('Please select')[0].strip() if 'Please select' in remaining else remaining
                                j += 1
                                continue

                            if 'Please select' in next_line:
                                parts = next_line.split('Please select')
                                if parts[0].strip():
                                    question_text += ' ' + parts[0].strip()
                                collecting_question = False
                                collecting_options = True
                                j += 1
                                continue

                            # Collect question text
                            if next_line and not next_line.startswith(('Data Location', 'Comments', 'Likelihood')):
                                question_text += ' ' + next_line
                                if '?' in next_line:
                                    collecting_question = False

                        # Collect options
                        if collecting_options or 'Please select' in next_line:
                            collecting_options = True

                            # Common option patterns
                            if next_line.startswith('Yes,'):
                                # Extract full Yes option
                                yes_opt = next_line
                                # Look ahead for continuation
                                k = j + 1
                                while k < len(lines) and not lines[k].startswith(('No,', 'Not applicable', 'Show possible', 'Comments')):
                                    if lines[k] and not re.search(rf'{section_id}\.[\dA-Z.]+', lines[k]):
                                        yes_opt += ' ' + lines[k]
                                        k += 1
                                    else:
                                        break
                                if yes_opt not in options:
                                    options.append(yes_opt.strip())
                                j = k - 1

                            elif next_line.startswith('No,'):
                                # Extract full No option
                                no_opt = next_line
                                k = j + 1
                                while k < len(lines) and not lines[k].startswith(('Yes,', 'Not applicable', 'Show possible', 'Comments')):
                                    if lines[k] and not re.search(rf'{section_id}\.[\dA-Z.]+', lines[k]):
                                        no_opt += ' ' + lines[k]
                                        k += 1
                                    else:
                                        break
                                if no_opt not in options:
                                    options.append(no_opt.strip())
                                j = k - 1

                            elif next_line == 'Not applicable' and 'Not applicable' not in options:
                                options.append('Not applicable')

                            if 'Show possible answers' in next_line or next_line == 'Comments':
                                collecting_options = False
                                if next_line == 'Comments':
                                    collecting_comments = True

                        # Collect comments
                        if next_line == 'Comments':
                            collecting_comments = True
                            j += 1
                            if j < len(lines) and not lines[j].startswith(('Data Location', 'Likelihood')):
                                comments = lines[j]
                            continue

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
                            'scoring': {
                                'likelihood': likelihood,
                                'overallImpact': overall_impact
                            },
                            'givenAnswer': {
                                'selectedOption': selected_option,
                                'comments': comments,
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
    print("Extracting Ford 2024 High Availability Survey...\n")

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
        ('Section M.htm', 'M'),
        ('Section N.htm', 'N'),
        ('Section N (PAGE 2).htm', 'N'),
        ('Section P.htm', 'P'),
        ('Section R.htm', 'R'),
        ('Section T.htm', 'T'),
        ('Section U.htm', 'U'),
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
            if section_id in all_sections:
                all_sections[section_id]['questions'].extend(section_data['questions'])
                print(f"  Added {len(section_data['questions'])} more questions to Section {section_id}")
            else:
                all_sections[section_id] = section_data
                print(f"  Extracted {len(section_data['questions'])} questions")

    sections_list = sorted(all_sections.values(), key=lambda x: x['sectionId'])

    survey = {
        'surveyId': 'ford-sig-lite-2024-high-availability',
        'surveyName': 'Ford SIG Lite 2024 - High Availability (ROC)',
        'surveyDescription': 'Ford Standardized Information Gathering (SIG) Lite 2024 - High Availability Risk Operations Center Survey',
        'createdDate': '2024-07-12',
        'sections': sections_list
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(survey, f, indent=2, ensure_ascii=False)

    total_questions = sum(len(s['questions']) for s in sections_list)
    scored_questions = sum(1 for s in sections_list for q in s['questions']
                          if q['scoring']['likelihood'] is not None)

    print(f"\nOK Successfully extracted {len(sections_list)} sections")
    print(f"OK Total questions: {total_questions}")
    print(f"OK Questions with scoring: {scored_questions}")
    print(f"OK Output saved to: {OUTPUT_FILE}\n")

    print("Summary by section:")
    for section in sections_list:
        scored = sum(1 for q in section['questions'] if q['scoring']['likelihood'] is not None)
        print(f"  Section {section['sectionId']}: {len(section['questions'])} questions ({scored} with scoring)")

if __name__ == '__main__':
    main()

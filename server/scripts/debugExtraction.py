import re
from pathlib import Path
from bs4 import BeautifulSoup

file_path = Path(r'C:\Users\justin\Desktop\IT Software\Custom Programs\NIST Tool\uploads\Ford 2024 High Availability (ROC) Survey\Section P.htm')
section_id = 'P'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
text = soup.get_text()
lines = [l.strip() for l in text.split('\n') if l.strip()]

print(f"Looking for pattern: {section_id}.[\dA-Z.]+")
print(f"\nScanning {len(lines)} lines...\n")

for i, line in enumerate(lines[:50]):
    if re.search(rf'{section_id}\.[\dA-Z.]+', line):
        print(f"MATCH at line {i}: {line[:150]}")
        q_match = re.search(rf'{section_id}\.([\dA-Z.]+)', line)
        if q_match:
            q_num = q_match.group(1)
            question_id = f"{section_id}.{q_num}"
            print(f"  Extracted q_num: {repr(q_num)}")
            print(f"  Final question_id: {question_id}")

            # Check selected answer extraction
            answer_match = re.search(rf'{section_id}\.{re.escape(q_num)}\s+(.+?)(?:Answered by:|$)', line)
            if answer_match:
                potential_answer = answer_match.group(1).strip()
                print(f"  Potential answer: {potential_answer[:100]}")
            print()

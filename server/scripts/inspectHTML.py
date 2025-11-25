from bs4 import BeautifulSoup
from pathlib import Path

html_file = Path(r'C:\Users\justin\Desktop\IT Software\Custom Programs\NIST Tool\uploads\Ford 2024 High Availability (ROC) Survey\Section A.htm')

with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

# Look for checked inputs
checked_inputs = soup.find_all('input', checked=True)
print(f'Checked inputs: {len(checked_inputs)}')

# Look for all inputs
all_inputs = soup.find_all('input')
print(f'Total inputs: {len(all_inputs)}')

# Sample some radio buttons
radios = soup.find_all('input', {'type': 'radio'})
print(f'\nRadio buttons: {len(radios)}')
if radios:
    print('\nFirst 3 radio buttons:')
    for i, radio in enumerate(radios[:3]):
        print(f'  {i+1}. {radio}')

# Look for selected answers in text
text = soup.get_text()
lines = [l.strip() for l in text.split('\n') if l.strip()]

# Find lines with checkmarks or answer indicators
for i, line in enumerate(lines[:100]):
    if 'A.1' in line:
        print(f'\nContext around A.1 (lines {i}-{i+10}):')
        for j in range(i, min(i+15, len(lines))):
            print(f'  {j}: {lines[j][:100]}')
        break

import sqlite3

conn = sqlite3.connect('server/database/compliance.db')
cursor = conn.cursor()

setting_ids = [54, 367, 348, 55, 53]
placeholders = ','.join(['?'] * len(setting_ids))

cursor.execute(f'''
SELECT
  s.id,
  s.display_name,
  COUNT(csm.control_id) as mapping_count
FROM m365_setting_catalog s
LEFT JOIN control_setting_mappings csm ON s.id = csm.setting_id
WHERE s.id IN ({placeholders})
GROUP BY s.id, s.display_name
''', setting_ids)

print('Setting ID | Display Name                             | Mapping Count')
print('-' * 80)
for row in cursor.fetchall():
    print(f'{row[0]:10} | {row[1][:40]:40} | {row[2]}')

conn.close()

import sqlite3

conn = sqlite3.connect('server/database/compliance.db')
cursor = conn.cursor()

cursor.execute('''
SELECT
  scc.id,
  s.id as setting_id,
  s.display_name,
  COUNT(scm.control_id) as control_count
FROM setting_compliance_checks scc
JOIN m365_setting_catalog s ON scc.setting_id = s.id
LEFT JOIN control_setting_mappings scm ON s.id = scm.setting_id
WHERE scc.policy_id = 48
GROUP BY scc.id, s.id, s.display_name
''')

rows = cursor.fetchall()
print('Setting compliance checks and their control mappings:')
print('CheckID | SettingID | Display Name                             | Control Count')
print('-' * 80)
for row in rows:
    print(f'{row[0]:7} | {row[1]:9} | {row[2][:40]:40} | {row[3]}')

conn.close()

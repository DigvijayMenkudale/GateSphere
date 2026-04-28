# Read the file
with open('accounts/views.py', 'r') as f:
    content = f.read()

# Fix the broken line
old_line = "security_code = request.POST.get(').strip() ifsecurity_code', '' role in ['SECURITY', 'ADMIN'] else ''"
new_line = "security_code = request.POST.get('security_code', '').strip() if role in ['SECURITY', 'ADMIN'] else ''"

content = content.replace(old_line, new_line)

# Write back
with open('accounts/views.py', 'w') as f:
    f.write(content)

print('Fixed!')

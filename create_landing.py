import os

html = '''{% load static %}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GateSphere - Smart Visitor Management</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/static/css/landing.css">
</head>
<body class gs-landing-page></body></html>'''

with open('templates/landing/home.html', 'w') as f:
    f.write(html)
print('OK')

from django.db import migrations

def seed_pages(apps, schema_editor):
    Page = apps.get_model('pages', 'Page')
    
    pages_data = [
        {
            'slug': 'documentation',
            'title': 'Documentation',
            'content': '# Documentation\\n\\nWelcome to the Visitor Log System documentation.\\n\\n## Getting Started\\n\\n- [Admin Dashboard](/dashboard/)\\n- [Security Dashboard](/dashboard/security/)\\n- [Host Dashboard](/dashboard/host/)\\n\\n## Features\\n\\n- Visitor check-in/out\\n- Photo capture\\n- Department management\\n- Role-based access',
        },
        {
            'slug': 'api_reference', 
            'title': 'API Reference',
            'content': '# API Reference\\n\\n## Available Endpoints\\n\\nComing soon...',
        },
        {
            'slug': 'guides',
            'title': 'Guides', 
            'content': '# User Guides\\n\\n## Security Team\\n1. Scan visitor QR code or manual entry\\n2. Capture photo\\n3. Assign host/department\\n4. Check-in visitor\\n\\n## Hosts\\n1. View assigned visitors\\n2. Approve pending requests',
        },
        {
            'slug': 'blog',
            'title': 'Blog',
            'content': '# Blog\\n\\nStay tuned for updates and tips.',
        },
        {
            'slug': 'help_center',
            'title': 'Help Center',
            'content': '# Help Center\\n\\n## Common Issues\\n- Forgot password? Use profile/change-password\\n- Visitor photo not saving? Check media permissions',
        },
        {
            'slug': 'status',
            'title': 'Status',
            'content': '# System Status\\n\\n**All services operational** ✅',
        },
        {
            'slug': 'terms',
            'title': 'Terms of Service',
            'content': '# Terms of Service\\n\\n1. Respect privacy\\n2. Proper use of visitor data\\n3. Report issues promptly',
        },
    ]
    
    for data in pages_data:
        Page.objects.get_or_create(
            slug=data['slug'],
            defaults={
                'title': data['title'],
                'content': data['content'],
                'is_active': True,
            }
        )



class Migration(migrations.Migration):
    dependencies = [
        ('pages', '0002_contactmessage'),
    ]
    
    operations = [
        migrations.RunPython(seed_pages),
    ]

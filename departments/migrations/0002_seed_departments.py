from django.db import migrations


def seed_departments(apps, schema_editor):
    """Seed the database with default departments."""
    Department = apps.get_model('departments', 'Department')
    
    departments = [
        'Administration',
        'Security',
        'Human Resources',
        'Sales',
        'IT Support',
        'Operations',
        'Finance',
        'Facilities Management',
        'Marketing',
        'Management',
    ]
    
    for dept_name in departments:
        Department.objects.get_or_create(
            name=dept_name,
            defaults={'is_active': True}
        )


def reverse_migration(apps, schema_editor):
    """Reverse the seed - remove all departments."""
    Department = apps.get_model('departments', 'Department')
    Department.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_departments, reverse_migration),
    ]

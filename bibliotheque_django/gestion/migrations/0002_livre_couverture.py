from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='livre',
            name='couverture',
            field=models.ImageField(blank=True, null=True, upload_to='livres/'),
        ),
    ]

from django import forms
from django.core.mail import send_mail
from django.conf import settings
from django.contrib import messages

class ContactForm(forms.Form):
    name = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'John Doe',
            'required': 'required'
        }),
        label='Full Name'
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-control', 
            'placeholder': 'john@example.com',
            'required': 'required'
        }),
        label='Email'
    )
    subject = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Describe your issue',
            'required': 'required'
        }),
        label='Subject'
    )
    message = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': '5',
            'placeholder': 'Tell us more about your issue...',
            'required': 'required'
        }),
        label='Message'
    )
    consent = forms.BooleanField(
        required=True,
        label="I consent to data processing as described in our Privacy Policy.",
        widget=forms.CheckboxInput(
            attrs={
                'class': 'form-check-input',
                'id': 'consent',
                'aria-describedby': 'consent-help'
            }
        )
    )

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if '@' not in email:
            raise forms.ValidationError("Please enter a valid email address.")
        return email


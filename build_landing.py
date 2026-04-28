# This script creates the complete landing page HTML
html_content = r'''{% load static %}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GateSphere - Smart Visitor Management for Modern Workplaces</title>
    <meta name="description" content="Digitally manage visitor registrations, approvals, and entry tracking with real-time security monitoring.">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    
    <!-- Landing Page CSS -->
    <link rel="stylesheet" href="{% static 'css/landing.css' %}">
</head>

<body class gs-landing-page">

<!-- ============================================
     NAVBAR
============================================= -->
<nav class lp-navbar navbar navbar-expand-lg fixed-top id mainNav " >
<div class container-fluid px-4 > 
<a classnavbar-brand fw-bold d-flex align-items-center href="/"
<i classbi bi-shield-check me-2></i
GateSphere /a

buttonclass = "navbar-toggler ms-auto"
type ="button"
data-bs-toggle ="collapse"
data-bs-target="#navbarNav"

aria-controls="
navbarNav aria-expanded=false aria-label=Toggle navigation
ibi bi-list text-white fs-1 /button


divclass collapse navbar-collapse justify-content-center id=navbarNav 
ulclass nav nav-pills gap-2 

liclass nav-item aclass nav-link active scroll-linkhref=#home Home /a li

liclass nav-item aclass nav-link scroll-linkhref=#features Features /a li

liclassnav-item aclassnav-linkscroll-linkhref=#how-it-works How It Works/a li

liclassnav-itemaclassnav-linkscroll-linkhref=#security Security/ali
 
liclassnav-itemaclassn av-linkscroll linkhr ef=#contact Contact/a li 

ul div 


divd-flexalign-items-centergap3 nabvar-right 
abuttonbtn btn-ghost rounded-pillpx4 py2scrollLinkhre f=#home Get Started/abutton ahref={%url login%}btn btn-outline-lightroundedpill px4py2 Login/a ahref={%url signup%}btn btn-primary roundedpillpx4py 2fw-semibold Sign Up/a  

div  div  



'''

with open('templates/landing/home.html', 'w') as f:
    f.write(html_content)
print("Landing page created")

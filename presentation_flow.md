
# Oromia Education Center - Booking Platform Presentation

---

## Slide 1: Title Slide

**Oromia Education Research and Training Center**
**Booking & Rental Management Platform**

A comprehensive digital solution for managing facility and dormitory rentals efficiently.

---

## Slide 2: Agenda

1.  **Introduction:** The Problem & Our Solution
2.  **User Roles:** Understanding the Actors
3.  **Public User Experience:** The Guest Journey
4.  **Dormitory Booking Flow:** For Individual Users
5.  **Company Booking Flow:** For Facility Rentals
6.  **The Administrator Experience:** Role-Based Dashboards
7.  **The Keyholder Workflow:** Managing Physical Access
8.  **Technology Stack**
9.  **Q&A**

---

## Slide 3: Introduction: The Problem & Our Solution

*   **The Problem:**
    *   Manual, paper-based booking processes are inefficient and prone to errors.
    *   Lack of a centralized system for tracking availability, payments, and approvals.
    *   Difficulty in generating timely reports for financial and operational oversight.

*   **Our Solution:**
    *   A modern, role-based web application that automates the entire booking lifecycle.
    *   Provides a seamless experience for public users, companies, and internal staff.
    *   Features real-time availability, automated cost calculation, streamlined digital approvals, and integrated reporting.

---

## Slide 4: User Roles: Understanding the Actors

Our platform is built for several key user types:

*   **Public User / Guest:** Anyone visiting the site to browse services.
*   **Individual User:** A guest who books a dormitory room for personal use.
*   **Company Representative:** A registered user booking facilities (halls, sections) on behalf of their organization.
*   **Dormitory Admin:** An admin assigned to a specific building, managing only their dormitories and bookings.
*   **General Admin:** Manages all bookings, facilities, and company approvals.
*   **Keyholder:** Staff responsible for the physical handover of keys for dormitory check-ins and check-outs.
*   **Super Admin:** Has complete control over the system, including user registration for all roles.

---

## Slide 5: The Public Experience: The Guest Journey

*   **Browse Services:** Users land on a professional homepage and can easily navigate to view available **Dormitories** and **Halls/Sections**.
*   **Check Real-Time Availability:** A powerful date-range picker allows users to see only the rooms and facilities that are available for their desired dates.
*   **View Details:** Users can see capacity, pricing, and images for each item.
*   **Self-Service Booking Check:** A dedicated page allows individual users to check the status of their active dormitory booking using just their phone number.
*   **Contact Information:** A clear "Contact Us" page provides points of contact for different buildings and general inquiries.

---

## Slide 6: Dormitory Booking Flow (Individual User)

A simple, 5-step process for individuals.

1.  **Select & Book:** User selects an available dormitory and fills out a simple form with their name, phone, and employer details.
2.  **Payment Instructions:** After submission, the user is immediately shown the total cost and the center's bank account details for payment transfer.
3.  **Upload Proof:** The user uploads a payment screenshot directly on the confirmation page or via a provided Telegram bot link.
4.  **Admin Verification:** An Admin receives a notification, views the uploaded proof, and verifies the payment, approving the booking.
5.  **Key Handover:** The booking now appears on the Keyholder's list, ready for key issuance upon the guest's arrival.

---

## Slide 7: Company Booking Flow (Facility Rental)

A structured workflow for organizational clients.

1.  **Company Registration:** A representative first registers their company. This account is created with a "Pending Approval" status.
2.  **Admin Approval (Company):** A General or Super Admin reviews and approves the company's registration.
3.  **Booking Request:** The approved representative can now book halls/sections, select catering services, and specify attendee numbers.
4.  **Admin Approval (Booking):** An Admin reviews the booking request and approves it.
5.  **Agreement Generation:** Upon booking approval, the system readies a rental agreement. The admin can customize terms if needed and marks it as "Sent to Client".
6.  **Client Signature & Upload:** The company representative can now view, download, print, sign, and upload the completed agreement file.
7.  **Finalization:** The Admin receives the signed document and marks the agreement process as "Completed".

---

## Slide 8: The Administrator Experience (Role-Based)

Each admin level has a dashboard and permissions tailored to their responsibilities.

*   **Super Admin:**
    *   Full, unrestricted access to all site features.
    *   **Can register new Admins and Keyholders.**
    *   Views global financial data and all reports.

*   **General Admin:**
    *   Manages all bookings (dorm & facility), companies, and approvals.
    *   Can access and manage financial settings and all reports.
    *   **Cannot register new users.**

*   **Dormitory Admin (Building-Specific):**
    *   **Restricted View:** Sidebar navigation and dashboard stats are filtered to show **only their assigned building's data.**
    *   Manages dormitories and bookings exclusively for their building.
    *   Cannot see or manage halls, facilities, companies, or financials.

---

## Slide 9: The Keyholder Workflow

A streamlined process for managing physical access to dormitories.

*   **Focused Dashboard:** Keyholders log in to a simple dashboard showing key stats like "Keys Issued" and "Keys Pending Issuance".
*   **"Assign Keys" Queue:** Their main page lists all **approved and paid** dormitory bookings, serving as a clear work queue.
*   **Daily Reports:** A vital page showing:
    *   **Check-ins Today:** Guests scheduled to arrive.
    *   **Check-outs Today:** Guests scheduled to depart.
    *   **Ongoing Stays:** A list of all current occupants.
*   **Simple Actions:** They can mark a key's status as "Issued" on arrival and "Returned" on departure with a single click.

---

## Slide 10: Technology Stack

Built with a modern, scalable, and maintainable technology stack.

*   **Frontend Framework:** Next.js (with React)
*   **UI Components:** ShadCN UI
*   **Styling:** Tailwind CSS
*   **Database:** Google Firestore
*   **Authentication:** Firebase Authentication
*   **File & Image Storage:** Cloudinary
*   **Customer Support Chat:** Tawk.to

---

## Slide 11: Thank You

**Thank You!**

**Questions?**

# Support Pages Backend Integration

## Overview
The support pages (/support/technical and /support/report) have been successfully integrated with the MySlotmate backend API to handle support ticket creation and evidence uploads.

## API Endpoints Used

### Support Ticket Management
- **POST /support/** - Create a new support ticket
- **GET /support/{ticketID}** - Retrieve a specific support ticket
- **GET /support/user/{userID}** - List all tickets for a user
- **POST /support/{ticketID}/message** - Add a message to a ticket thread
- **POST /support/{ticketID}/resolve** - Mark a ticket as resolved

### File Upload
- **POST /upload/** - Upload evidence files to AWS S3

## Available React Hooks

### Query Hooks
- `useSupportTicket(ticketId)` - Fetch a single support ticket
- `useUserTickets(userId)` - Fetch all support tickets for a user

### Mutation Hooks
- `useCreateSupportTicket()` - Create a new support ticket
- `useAddSupportMessage(ticketId, message)` - Add a message to a ticket
- `useResolveSupportTicket(ticketId)` - Mark a ticket as resolved
- `useUploadFiles(files, folder)` - Upload files to S3

## Technical Support Page (/support/technical/page.tsx)

### Form Fields
1. **Issue Category** - Dropdown (session, booking, payment, dashboard)
2. **Which Experience** - Dropdown (Experience selector)
3. **Priority Level** - Button group (Low, Medium, Critical)
4. **Description** - Textarea (issue details)
5. **Attachments** - File upload with drag-and-drop

### Backend Integration
- **Category:** `technical_support`
- **Subject:** Auto-generated from category and priority level
- **Message:** Description from textarea
- **Is Urgent:** Set to true if priority is "Critical"
- **Evidence URLs:** Uploaded via `/upload/` endpoint

### Features
- Validates required fields before submission
- Shows loading state during form submission
- Uploads attachments to S3 before creating ticket
- Displays success/error toast notifications
- Resets form after successful submission
- Requires user authentication (checks Firebase auth)

## Report Page (/support/report/page.tsx)

### Form Fields
1. **Type of Issue** - Dropdown (for categorization)
2. **Session Date** - Date selector
3. **Participant Name** - Text input
4. **Report Reason** - Button group (Verbal harassment, Safety concern, Inappropriate behavior, Spam or scam)
5. **Description** - Textarea (detailed explanation)
6. **Supporting Evidence** - File upload with drag-and-drop
7. **Urgent Flag** - Toggle switch for urgent reports

### Backend Integration
- **Category:** `report_participant`
- **Subject:** Auto-generated as "Report: {Participant Name}"
- **Message:** Description from textarea
- **Session Date:** Optional date/time of incident
- **Report Reason:** Mapped to API-compatible values
- **Is Urgent:** From toggle switch
- **Evidence URLs:** Uploaded via `/upload/` endpoint

### Features
- Validates all required fields
- Converts report reasons to API format (snake_case)
- Shows loading state during submission
- Uploads evidence files to S3
- Displays comprehensive error handling
- Resets form after successful submission
- Requires user authentication

## Data Type Mapping

### Technical Support
```typescript
{
  user_id: string;              // From Firebase auth
  category: "technical_support";
  subject: string;              // Auto-generated with category + priority
  message: string;              // Description field
  evidence_urls?: string[];     // S3 URLs from upload
  is_urgent?: boolean;          // From priority level
}
```

### Report Support
```typescript
{
  user_id: string;              // From Firebase auth
  category: "report_participant";
  subject: string;              // Auto-generated: "Report: {name}"
  message: string;              // Description field
  session_date?: string;        // ISO format from date picker
  report_reason?: string;       // Mapped value (snake_case)
  evidence_urls?: string[];     // S3 URLs from upload
  is_urgent?: boolean;          // From toggle switch
}
```

## Support Category Enum Values
- `technical_support` - For technical issues (technical page)
- `report_participant` - For participant reports (report page)
- `policy_help` - For policy clarifications (not implemented yet)

## Report Reason Mapping
- "Verbal harassment" → `verbal_harassment`
- "Safety concern" → `safety_concern`
- "Inappropriate behavior" → `inappropriate_behavior`
- "Spam or scam" → `spam_or_scam`

## File Upload Configuration
- **Folder:** `support/evidence`
- **Accepted Types:** SVG, PNG, JPG, PDF
- **Max Size:** 10MB per file
- **Storage:** AWS S3 (backend handles)

## Error Handling
- **Authentication:** Checks for Firebase user before submission
- **Validation:** Validates required fields with error messages
- **File Size:** Validates file size (10MB limit)
- **Network:** Catches and displays API errors
- **UX:** Shows loading state during submission
- **Toast Notifications:** Provides user feedback

## User Experience Enhancements
1. **Loading States:** Button shows "Submitting..." during form submission
2. **Disabled Submission:** Form cannot be submitted without authentication
3. **File Validation:** Real-time file size checking with error feedback
4. **Success Messages:** Clear confirmation after ticket creation
5. **Error Display:** User-friendly error messages for failed submissions
6. **Form Reset:** Clears form after successful submission
7. **Optional Attachments:** Users can submit without evidence files

## Future Enhancements
1. Display list of user's submitted tickets
2. Allow users to track ticket status
3. Show real-time updates when support team responds
4. Add ticket viewing/editing page
5. Implement ticket search and filtering
6. Add email notifications for ticket updates
7. Create admin dashboard for support team

## API Base URL
Set in environment variables: `NEXT_PUBLIC_API_URL`
Default: http://localhost:8080 (development)
Production: https://myslotmate-backend.onrender.com

## Testing Checklist
- [ ] Create technical support ticket with attachment
- [ ] Create report with all fields filled
- [ ] Test file upload with drag-and-drop
- [ ] Verify error handling for required fields
- [ ] Test authentication requirement
- [ ] Verify file size limit validation
- [ ] Test form reset after submission
- [ ] Verify toast notifications display correctly
- [ ] Test with slow network (verify loading state shows)
- [ ] Test offline behavior

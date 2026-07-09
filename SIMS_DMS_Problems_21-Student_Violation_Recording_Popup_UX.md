# SIMS DMS Problems 21 — Student Violation Recording Popup UI/UX Issues

**Status:** Open · **Priority:** High · **Areas:** Frontend, Mobile UX, Student Violations

---

## Problem: Student Violation Recording Popup UI/UX Issues on Desktop and Mobile

The Record Student Violation popup functionality is working, but the current design and user experience are not optimized, especially on mobile devices. The popup currently behaves like a full-page modal instead of a compact, user-friendly form, creating difficulty when faculty members are trying to quickly record violations during duty hours.

---

## 1. Mobile Popup Size Issue

### Current Behaviour
When the user opens the Record Student Violation popup on mobile:
- The popup expands almost from the top of the screen to the bottom
- It occupies nearly the entire mobile viewport
- The user loses visibility of the background page
- The popup feels like a separate page rather than a quick action form

This makes the interaction slow and uncomfortable.

### Expected Behaviour
The popup should behave like a proper mobile bottom sheet / compact modal:
- Maximum height around 80–85% of screen height
- Rounded top corners
- Internal scrolling only when required
- Sticky action buttons at bottom

---

## 2. Search Student Field Mobile Issue

### Current Problem
When the faculty searches for a student:
- The mobile keyboard opens
- The keyboard covers the student search results
- The dropdown list appears behind the keyboard
- Faculty cannot properly see or select the student
- The search experience becomes difficult

### Required Fix
The student search component should be redesigned for mobile.

### Expected Behaviour
When typing a student name:
- Results should appear in a floating dropdown above the keyboard
- Results must always remain visible and selectable

---

## 3. Improve Student Search UX

The student search should support multiple search criteria:
- Search by student name
- Search by registration number (e.g., `SIMS252026038`)

---

## 4. Desktop Popup Optimization

### Current Desktop Issue
On PC:
- Popup width is acceptable but feels too vertically stretched
- Too much empty space
- Form fields are not grouped efficiently
- The user needs unnecessary scrolling

### Recommended Desktop Layout
The popup should be redesigned into clear sections:
- **Duty Information** section (Morning Session, Date)
- **Student** section (Search Student)
- **Violation Details** section (Violation Type, Fine Amount)
- **Action buttons** (Cancel, Record Violation)

---

## 5. Sticky Footer Actions

### Current Issue
- Action buttons (Cancel, Record Student Violation) are placed at the bottom of the popup content
- On smaller screens, users may need to scroll to access them

### Required Change
Make action buttons sticky so they always remain visible at the bottom of the modal.

---

## 6. Improve Popup Scrolling Behaviour

### Current Issue
The entire modal scrolls.

### Required Structure
```
Modal
  ├── Header (Fixed)
  ├── Content (Scrollable)
  └── Footer (Fixed)
```

Only the content area should scroll, with header and footer remaining visible.

---

## 7. Maintain Quick Add Mode Functionality

The existing Quick-add mode functionality (stay open to record multiple violations) should remain with these improvements:
- When enabled, the modal should reset student selection after saving
- It should keep the duty slot information
- It should allow rapid violation recording

---

## 8. Responsive Design Requirement

The popup must be optimized separately for:

**Desktop**
- Center modal
- Fixed reasonable width
- Minimal scrolling
- Clear sections

**Tablet**
- Responsive width
- Touch-friendly controls

**Mobile**
- Bottom-sheet style
- Keyboard-aware search
- Sticky buttons
- Proper dropdown visibility

---

## Additional Problem: Missing Success Confirmation After Recording Student Violation

### Current Issue
After the faculty member submits a student violation record, the system does not provide any clear confirmation that the violation has been successfully saved.

After clicking "Record Student Violation", the user is unsure whether:
- The violation was successfully recorded
- The submission failed
- The system is still processing
- The data was saved or not

This creates confusion, especially when faculty members are recording violations quickly during duty sessions.

### Required Enhancement
After successful submission, display a clear success confirmation message. The confirmation should appear only after the backend confirms that the record has been successfully saved.

---

## Expected Success Message Design

### UI Recommendation
Use a modern success toast/alert with:
- Green check icon
- Green success indicator
- Auto-dismiss after a few seconds
- Smooth animation
- Clearly visible on desktop and mobile

Example format:
```
✓ Violation Recorded Successfully

Student: Nikhil Srivastava
Violation: Uniform
Recorded at: 08 July 2026 - Morning Session
```

---

## System Behaviour After Successful Submission

### Normal Mode
If Quick-add mode is OFF:
1. Submit Violation
2. Save to database
3. Show success confirmation
4. Close popup automatically

### Quick-add Mode
If Quick-add mode is ON:
1. Submit Violation
2. Save to database
3. Show success confirmation
4. Keep popup open
5. Reset student selection
6. Ready for next violation

### Error Handling
If saving fails:
- Do not show success message
- Instead display: `✕ Unable to Record Violation` with a red error indicator and retry option

---

## Additional Data Sync Confirmation

After successful submission, the system should also update immediately:
- Student violation count
- Student profile violation history
- Admin violation dashboard
- User recorded violation list
- Reports data

The user should see confirmation only after all required data is successfully stored.

---

## Final Expected User Experience

A faculty member during duty should be able to:
1. Click "Record Student Violation"
2. Popup opens quickly
3. Search student easily
4. Select student without keyboard blocking results
5. Choose violation type
6. Auto-filled fine appears based on violation type
7. Submit violation
8. Continue recording if Quick Add mode is enabled

---

## Summary

The student violation recording workflow needs:
✅ Optimized mobile bottom-sheet design  
✅ Keyboard-aware search dropdown  
✅ Multi-criteria student search (name + reg number)  
✅ Clear desktop layout with sections  
✅ Sticky header/footer with scrollable content  
✅ Success/error confirmation messages  
✅ Data sync confirmation before closing  
✅ Responsive design for all screen sizes  

This will improve confidence and usability during real-time student monitoring.check my railway cli once deployment failed
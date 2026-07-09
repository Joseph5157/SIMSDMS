# SIMS DMS Problems 23 — Student Management Section Issues & Requirements

**Status:** Open · **Priority:** High · **Areas:** Student Management, Data Structure, UI/UX

---

## Problem 1: Remove "Section" Completely from Student Management

In the Student Management section, the system is still showing Section in multiple places, but Section is no longer required in the academic structure.

### Current Locations Where Section Appears

Section is currently visible in:
- Top filter area as "All sections"
- Student table column as "Section"
- Student profile popup (if shown)
- Student upload/import data (if still connected)

### Required Change

Remove Section completely from everywhere in the Student Management module.

### What to Remove

- ❌ All sections filter
- ❌ Section table column
- ❌ Section data from student details popup
- ❌ Section dependency from search/filter logic

### Expected Behavior

The Student Management page should not show any Section-related field, filter, or column. The student table should look cleaner and should only show the required academic fields.

---

## Problem 2: Year and Semester Should Be Separate Columns

Currently, Year / Semester is merged into one column, displaying as:
```
6 / 12
```

This is not the required format.

### Why This Is a Problem

- Year and Semester are two different academic details
- Keeping them merged makes filtering, reading, and reporting less clear
- Separate columns improve data organization and usability

### Expected Behavior

Show them as two separate columns:

| Year | Semester |
|------|----------|
| 6    | 12       |

### Where This Should Be Applied

- Student Management table
- Student profile popup
- Reports (if student academic details are shown)
- Excel upload/import format (if applicable)

---

## Implementation Summary

### Changes Required

1. **Student Management Table**
   - Remove the "Section" column entirely
   - Split "Year / Semester" into two separate columns: "Year" and "Semester"
   - Update table layout to reflect these changes

2. **Student Profile Popup/Details**
   - Remove any Section field from student details
   - Display Year and Semester as separate fields (if shown in popup)

3. **Filters and Search**
   - Remove "All sections" filter from top filter area
   - Ensure year/semester filtering works with separate columns

4. **Data Import/Upload**
   - If Excel upload format is used, update template to include Year and Semester as separate columns
   - Remove Section column from import format

5. **Reports**
   - Update any reports that display student academic details to use separate Year and Semester columns
   - Remove Section from report output

---

## Result

After these changes, the Student Management section will:
- ✅ Be cleaner without Section data
- ✅ Have clearer Year and Semester distinction
- ✅ Be more intuitive for filtering and reporting
- ✅ Better reflect the current academic structure

# SIMS DMS Problems 24 — Transform Student Violations into Comprehensive Discipline Analytics Dashboard

**Status:** Open · **Priority:** High · **Areas:** Admin Dashboard, Analytics, Student Discipline, Reporting

---

## Current Problem

The current Student Violations section in the Admin Dashboard only displays a basic table of recorded violations with fields like:
- Student name
- Faculty who recorded the violation
- Violation type
- Fine amount
- Status
- Flagged status

This only provides a record listing and does not help the admin understand overall student discipline patterns.

---

## Required Improvement

Redesign the Student Violations section as a **Student Discipline Analytics Dashboard** that combines:
- Visual analytics
- Violation tracking
- Student behaviour analysis
- Counselling identification

The admin should be able to quickly understand: **"Which students are repeatedly violating, why they are violating, and where intervention is required."**

---

## 1. Dashboard Summary Cards (Top Section)

Add summary cards at the top to show key metrics.

### Total Violations Card
Shows total violations recorded for the selected period.
```
Total Violations
245
This Month
```

### Students Affected Card
Shows number of unique students who received violations.
```
Students Affected
68
Unique students
```

### Repeat Violators Card
Shows students with multiple violations requiring counselling.
```
Repeat Violators
15
Need counselling
```

### Most Common Violation Card
Shows the most frequent violation type.
```
Most Common
Uniform Violation
42 cases
```

---

## 2. Time-Based Filters

Admin should be able to dynamically filter data across multiple dimensions.

### Date Range Filter
Options:
- This Week
- This Month
- Last Month
- Custom Date Range

### Academic Year Filter
Dynamic from student records.

### Course Filter
Dynamic from student records.
Example options:
- B.Pharm
- Pharm.D
- M.Pharm

### Year/Semester Filter
Dynamic filtering by student year/semester.

### Violation Type Filter
**Important:** This filter must be dynamic and automatically load violation types created in the Student Violation Types settings.

Example: If admin creates:
- Uniform Violation
- Late Coming
- Mobile Usage
- Misbehaviour

These automatically appear in the filter dropdown. **No hardcoded violation types.**

---

## 3. Violation Trend Analysis

Add graphical representation of violations over time.

### Weekly/Monthly Violation Trend
Line graph showing violation counts:
```
Violations
|
|        *
|     *
|  *
|________________
 Jan Feb Mar Apr
```

**Purpose:** Admin can see whether violations are increasing or decreasing over time.

---

## 4. Violation Type Analysis

Add bar chart showing most common violations.

### Most Common Violations Bar Chart
```
Uniform          █████████ 45
Late Coming      ██████ 30
Mobile Usage     ████ 20
Behaviour        ██ 10
```

**Purpose:** Identify the major discipline issues in college.

---

## 5. Course-Wise Violation Analysis

Show violations broken down by course.

### Violations by Course Bar Chart
```
B.Pharm     ██████████ 120
Pharm.D     █████ 60
M.Pharm     ██ 20
```

**Purpose:** Identify which course requires more attention.

---

## 6. Academic Year Analysis

Show violations based on academic year.

### Year Wise Bar Chart
```
1st Year    ███████ 70
2nd Year    █████ 50
3rd Year    ████ 40
4th Year    ██ 20
```

**Purpose:** Identify whether junior or senior students need more monitoring.

---

## 7. Repeat Violator Identification

Most important section for intervention identification.

### Students Requiring Counselling Table
Dedicated table showing repeat offenders.

| Student | Course | Year | Violations | Main Issue |
|---------|--------|------|-----------|-----------|
| John    | B.Pharm | 2nd Year | 8 | Late Coming |
| Rahul   | Pharm.D | 3rd Year | 6 | Uniform |
| Priya   | B.Pharm | 1st Year | 7 | Mobile Usage |

**Sort by:** Highest violations first.

---

## 8. Individual Student Violation Profile

When clicking a student, open detailed popup/profile.

### Student Information Section
Display:
- Name
- Registration Number
- Course
- Year
- Academic Year

**Remove unnecessary fields:**
- ❌ Phone
- ❌ Gender
- ❌ Section

### Violation Summary Section
```
Total Violations: 12

Breakdown:
Uniform Violation     5
Late Coming           4
Mobile Usage          2
Other                 1
```

### Complete Violation History
Show all violations (not just recent):

| Date | Type | Faculty | Remarks | Fine |
|------|------|---------|---------|------|
| 08-Jul-2026 | Uniform | Dr. Rahmatulla | - | ₹500 |
| 05-Jul-2026 | Late Coming | Dr. ABC | - | ₹200 |
| ... | ... | ... | ... | ... |

---

## 9. Faculty Recording Analysis

Show which faculty recorded violations.

### Recorded By Section
```
Dr. Rahmatulla     40 violations
Dr. ABC            25 violations
Dr. XYZ            18 violations
```

**Purpose:** Audit recording patterns and understand faculty reporting consistency.

---

## 10. Heatmap View (Optional but Recommended)

Add calendar heatmap to identify problematic periods.

### Calendar Heatmap
- **Green** = Fewer violations
- **Red** = Higher violations

**Purpose:** Identify problematic days and patterns.

Examples:
- Monday morning violations higher than other days
- Violations spike during exam periods
- Specific times with recurring issues

---

## 11. Export Capability

Allow admin to export analytics and reports.

### Export Formats
- Excel (.xlsx)
- PDF

### Exportable Reports
- Violation summary
- Repeat offenders list
- Student counselling list
- Monthly/period report

---

## Final Expected Outcome

The Student Violations section should become a **discipline intelligence dashboard**, not just a table.

### Questions the Admin Should Be Able to Answer

✅ **Which students violate repeatedly?**
- Repeat Violators card + Counselling table

✅ **Which violation type is most common?**
- Most Common card + Violation Type Analysis graph

✅ **Which course has more discipline issues?**
- Course-Wise Violation Analysis graph

✅ **Which academic year needs attention?**
- Academic Year Analysis graph

✅ **Who needs counselling?**
- Dedicated "Students Requiring Counselling" table

✅ **Has discipline improved or worsened over time?**
- Violation Trend Analysis graph

### System Purpose

The system should help convert raw violation records into actionable counselling and intervention decisions.

---

## Implementation Priorities

**Phase 1 (Critical):**
- Summary cards
- Time-based filters
- Violation type analysis (bar chart)
- Repeat violator table

**Phase 2 (High):**
- Trend analysis (line graph)
- Course-wise and year-wise analysis
- Individual student profile

**Phase 3 (Medium):**
- Faculty recording analysis
- Calendar heatmap
- Export capability

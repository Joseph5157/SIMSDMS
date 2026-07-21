// Per-course year ranges — B.Pharm and M.Pharm are 4- and 2-year programs
// respectively; Pharm.D is 6 years including internship. Single source of
// truth for both student-upload validation and the analytics year chart.
const COURSE_YEAR_RANGES = { b_pharm: [1, 4], pharm_d: [1, 6], m_pharm: [1, 2] };
const COURSE_LABELS = { b_pharm: 'B.Pharm', pharm_d: 'Pharm.D', m_pharm: 'M.Pharm' };

module.exports = { COURSE_YEAR_RANGES, COURSE_LABELS };

import { IconMan, IconWoman, IconShieldCheck, IconCrown } from '@tabler/icons-react';

// Predefined avatar options: value must match the backend's AVATAR_OPTIONS enum
// (server/schemas/users.schema.js). `null`/unset falls back to initials.
export const AVATAR_OPTIONS = [
  { value: 'male_professor',   label: 'Male Professor',   Icon: IconMan,         gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
  { value: 'female_professor', label: 'Female Professor', Icon: IconWoman,       gradient: 'linear-gradient(135deg, #ec4899, #f472b6)' },
  { value: 'admin',            label: 'Admin',            Icon: IconShieldCheck, gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { value: 'super_admin',      label: 'Super Admin',      Icon: IconCrown,       gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
];

export function getAvatarOption(value) {
  return AVATAR_OPTIONS.find((a) => a.value === value) ?? null;
}

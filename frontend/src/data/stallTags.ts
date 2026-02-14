export type StallTagColor = 'red' | 'yellow' | 'green' | 'grey';

export interface StallTagOption {
  id: number;
  label: string;
  color: StallTagColor;
  score: number;
}

export const stallTagOptions: StallTagOption[] = [
  { id: 1, label: 'High Intent', color: 'red', score: 10 },
  { id: 2, label: 'Interested', color: 'red', score: 7 },
  { id: 3, label: 'Follow-up Needed', color: 'red', score: 5 },
  { id: 4, label: 'Call Tomorrow', color: 'red', score: 4 },
  { id: 5, label: 'Meeting Requested', color: 'red', score: 9 },
  { id: 6, label: 'Referred Lead', color: 'red', score: 6 },
  { id: 7, label: 'Exploring Options', color: 'yellow', score: 2 },
  { id: 8, label: 'Met at Stall', color: 'yellow', score: 1 },
  { id: 9, label: 'Networking Floor', color: 'yellow', score: 1 },
  { id: 10, label: 'Business Owner', color: 'yellow', score: 2 },
  { id: 11, label: 'HNI Client', color: 'green', score: 3 },
  { id: 12, label: 'Wealth Management', color: 'green', score: 2 },
  { id: 13, label: 'Tax Planning', color: 'green', score: 2 },
  { id: 14, label: 'Mutual Funds', color: 'green', score: 2 },
  { id: 15, label: 'Not Relevant', color: 'grey', score: -10 },
];

import React, { useState } from 'react';
import { User } from '../types.ts';

interface ReportModalProps {
  reportedUser: User;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
}

const REPORT_REASONS = [
  "Spam",
  "Nudity or sexual activity",
  "Hate speech or symbols",
  "Inappropriate content",
  "Impersonation",
  "Other"
];

const ReportModal: React.FC<ReportModalProps> = ({ reportedUser, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    if (!reason) {
      alert("Please select a reason for the report.");
      return;
    }
    onSubmit(reason, details);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-lg w-11/12 max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">Report {reportedUser.name}</h2>
        <p className="text-gray-600 mt-2">Why are you reporting this user?</p>

        <div className="space-y-2 mt-4">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left p-2 rounded-lg border ${reason === r ? 'bg-flame-orange/20 border-flame-orange' : 'hover:bg-gray-100'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {reason === "Other" && (
            <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please provide more details..."
                className="w-full mt-2 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-flame-orange"
                rows={3}
            />
        )}
        
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason}
            className="py-2 px-4 bg-error-red text-white rounded-lg font-semibold disabled:opacity-50"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;

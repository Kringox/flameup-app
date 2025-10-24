import React, { useState } from 'react';

interface DeleteAccountModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState('');
  const CONFIRM_TEXT = "LÖSCHEN";

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-lg w-11/12 max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-error-red">Delete Account</h2>
        <p className="text-gray-600 mt-2">
          This is a permanent action and cannot be undone. All your matches, messages, and profile data will be erased forever.
        </p>
        <p className="mt-4 text-sm text-gray-700">
          To confirm, please type "<strong className="font-mono">{CONFIRM_TEXT}</strong>" in the box below.
        </p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-error-red"
        />
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={inputValue !== CONFIRM_TEXT}
            className="py-2 px-4 bg-error-red text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
"use client";

import { useState } from "react";
import type { AdditionalRule } from "@prisma/client";

interface AdditionalRuleEditModalProps {
  rule: AdditionalRule;
  isOpen: boolean;
  onClose: () => void;
  onRuleUpdated: () => void;
}

export function AdditionalRuleEditModal({ rule, isOpen, onClose, onRuleUpdated }: AdditionalRuleEditModalProps) {
  const [formData, setFormData] = useState({
    topic: rule.topic,
    silo: rule.silo,
    entity: rule.entity,
    text: rule.text,
    links: rule.links || "",
    notes: rule.notes || "",
    active: rule.active,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/additional-rules/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      onRuleUpdated();
    } catch (error) {
      console.error('Error updating rule:', error);
      setError('Failed to update rule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Edit Additional Rule</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
                Topic
              </label>
              <input
                type="text"
                name="topic"
                id="topic"
                value={formData.topic}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="silo" className="block text-sm font-medium text-gray-700">
                Silo
              </label>
              <select
                name="silo"
                id="silo"
                value={formData.silo}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              >
                <option value="">Select silo</option>
                <option value="Spread Bet">Spread Bet</option>
                <option value="CFD">CFD</option>
                <option value="LISTED STOCKS">LISTED STOCKS</option>
                <option value="CRYPTO">CRYPTO</option>
                <option value="Wallet">Wallet</option>
              </select>
            </div>

            <div>
              <label htmlFor="entity" className="block text-sm font-medium text-gray-700">
                Entity
              </label>
              <select
                name="entity"
                id="entity"
                value={formData.entity}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              >
                <option value="">Select entity</option>
                <option value="UK">UK</option>
                <option value="EU">EU</option>
                <option value="EU CY">EU CY</option>
                <option value="ROW">ROW</option>
              </select>
            </div>

            <div>
              <label htmlFor="active" className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  id="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 block text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700">
              Text
            </label>
            <textarea
              name="text"
              id="text"
              rows={4}
              value={formData.text}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="links" className="block text-sm font-medium text-gray-700">
              Links (optional)
            </label>
            <textarea
              name="links"
              id="links"
              rows={2}
              value={formData.links}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter links separated by commas or new lines"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={2}
              value={formData.notes}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter any additional notes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";

interface Props {
  icon: string;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionHref,
}: Props) {
  return (
    <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>

      {message && <p className="text-gray-600 mt-1 mb-6">{message}</p>}

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

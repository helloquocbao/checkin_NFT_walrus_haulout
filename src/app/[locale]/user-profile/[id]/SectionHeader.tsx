"use client";

interface Props {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

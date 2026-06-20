"use client";

import { useRouter } from "next/navigation";

export default function CommunityFilter({
  communities,
  year,
  month,
  communityId,
}: {
  communities: { id: string; name: string }[];
  year: number;
  month: number;
  communityId: string;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={communityId}
      onChange={(e) => {
        const params = new URLSearchParams({ year: String(year), month: String(month) });
        if (e.target.value) params.set("community", e.target.value);
        router.push(`/admin/calendar?${params}`);
      }}
      className="input max-w-xs"
    >
      <option value="">All communities</option>
      {communities.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

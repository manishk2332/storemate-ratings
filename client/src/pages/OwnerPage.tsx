import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ErrorState, EmptyState, LoadingState, PageHeader, RatingDisplay, SortButton, StatCard } from "@/components/AppShell";

type SortBy = "name" | "email" | "address" | "rating" | "submittedAt";

export default function OwnerPage() {
  const [sortBy, setSortBy] = useState<SortBy>("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const dashboard = trpc.owner.dashboard.useQuery({ sortBy, sortDirection });
  const toggleSort = (next: SortBy) => {
    if (sortBy === next) setSortDirection(current => current === "asc" ? "desc" : "asc");
    else { setSortBy(next); setSortDirection("asc"); }
  };
  if (dashboard.isLoading) return <LoadingState />;
  if (dashboard.error) return <ErrorState message={dashboard.error.message} />;
  const data = dashboard.data;
  if (!data?.store) return <><PageHeader eyebrow="Store owner workspace" title="Your store is almost ready." description="Ask an administrator to assign a store to your owner account." /><EmptyState title="No assigned store" message="Once your store is assigned, rating activity will appear here." /></>;
  return <div><PageHeader eyebrow="Store owner workspace" title="Your store, in focus." description={`${data.store.name} · ${data.store.address}`} action={<RatingDisplay value={data.averageRating} />} /><div className="stats-grid"><StatCard label="Average rating" value={data.averageRating ? data.averageRating.toFixed(1) : "—"} detail="Across all submitted ratings" tone="amber" /><StatCard label="Total ratings" value={data.totalRatings} detail="People who shared a signal" tone="blue" /><StatCard label="Store email" value={data.store.email} detail="Your public contact record" tone="ink" /></div><div className="section-head"><div><h2>People who rated your store</h2><p>Use the column controls to sort reviewer activity.</p></div></div><div className="card table-card">{!data.submitters.length ? <EmptyState title="No ratings yet" message="Your first customer rating will appear here." /> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th><SortButton label="User" active={sortBy === "name"} direction={sortDirection} onClick={() => toggleSort("name")} /></th><th><SortButton label="Email" active={sortBy === "email"} direction={sortDirection} onClick={() => toggleSort("email")} /></th><th><SortButton label="Address" active={sortBy === "address"} direction={sortDirection} onClick={() => toggleSort("address")} /></th><th><SortButton label="Rating" active={sortBy === "rating"} direction={sortDirection} onClick={() => toggleSort("rating")} /></th><th><SortButton label="Submitted" active={sortBy === "submittedAt"} direction={sortDirection} onClick={() => toggleSort("submittedAt")} /></th></tr></thead><tbody>{data.submitters.map(person => <tr key={person.id}><td className="cell-primary">{person.name}</td><td>{person.email}</td><td>{person.address}</td><td><RatingDisplay value={person.rating} /></td><td>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(person.submittedAt))}</td></tr>)}</tbody></table></div>}</div></div>;
}

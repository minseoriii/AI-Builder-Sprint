from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol
from uuid import UUID


class StarEntryLike(Protocol):
    id: UUID
    content: str
    related_values: list
    created_at: datetime


def _data_sufficiency(total_records: int) -> str:
    if total_records == 0:
        return "none"
    if total_records <= 2:
        return "low"
    if total_records <= 6:
        return "medium"
    return "sufficient"


def _round_rate(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator * 100, 1)


def compute_alignment_statistics(
    north_star_core_values: list[dict],
    star_entries: list[StarEntryLike],
) -> dict[str, Any]:
    total_records = len(star_entries)
    north_star_tags = {cv["tag"] for cv in north_star_core_values}
    weight_by_tag = {cv["tag"]: cv["weight"] for cv in north_star_core_values}

    aligned_records = 0
    for entry in star_entries:
        entry_tags = {rv["tag"] for rv in entry.related_values}
        if entry_tags & north_star_tags:
            aligned_records += 1

    aligned_record_rate = _round_rate(aligned_records, total_records)

    value_observations: list[dict[str, Any]] = []
    for cv in north_star_core_values:
        tag = cv["tag"]
        observed_count = 0
        strength_sum = 0
        for entry in star_entries:
            for rv in entry.related_values:
                if rv["tag"] == tag:
                    observed_count += 1
                    strength_sum += rv["strength"]
                    break

        value_observations.append(
            {
                "tag": tag,
                "north_star_weight": weight_by_tag[tag],
                "observed_record_count": observed_count,
                "observation_rate": _round_rate(observed_count, total_records),
                "strength_sum": strength_sum,
            }
        )

    representative_records: dict[str, list[dict[str, Any]]] = {}
    for cv in north_star_core_values:
        tag = cv["tag"]
        candidates: list[tuple[int, datetime, StarEntryLike, dict]] = []
        for entry in star_entries:
            for rv in entry.related_values:
                if rv["tag"] == tag:
                    candidates.append(
                        (rv["strength"], entry.created_at, entry, rv)
                    )
                    break

        candidates.sort(key=lambda item: (-item[0], -item[1].timestamp()))
        selected = candidates[:2]
        representative_records[tag] = [
            {
                "star_id": str(entry.id),
                "content": entry.content[:200],
                "strength": strength,
                "evidence": rv["evidence"],
                "created_at": entry.created_at.isoformat(),
            }
            for strength, _created_at, entry, rv in selected
        ]

    sorted_by_rate = sorted(value_observations, key=lambda v: v["observation_rate"])
    if sorted_by_rate and total_records > 0:
        min_rate = sorted_by_rate[0]["observation_rate"]
        less_observed_values = [
            {"tag": v["tag"], "observation_rate": v["observation_rate"]}
            for v in sorted_by_rate
            if v["observation_rate"] == min_rate
            or v["observation_rate"] <= min_rate + 10
        ]
        if len(less_observed_values) == len(value_observations):
            less_observed_values = sorted_by_rate[: max(1, len(sorted_by_rate) // 2)]
    else:
        less_observed_values = []

    return {
        "total_records": total_records,
        "aligned_records": aligned_records,
        "aligned_record_rate": aligned_record_rate,
        "value_observations": value_observations,
        "representative_records": representative_records,
        "less_observed_values": less_observed_values,
        "data_sufficiency": _data_sufficiency(total_records),
    }


def build_report_context_for_ai(
    north_star_summary: str,
    north_star_core_values: list[dict],
    statistics: dict[str, Any],
) -> str:
    lines = [
        f"북극성 요약: {north_star_summary}",
        f"전체 기록 수: {statistics['total_records']}",
        f"정렬 기록 수: {statistics['aligned_records']}",
        f"정렬 기록 비율(aligned_record_rate): {statistics['aligned_record_rate']}%",
        f"데이터 충분도: {statistics['data_sufficiency']}",
        "",
        "가치별 관찰 통계:",
    ]
    for vo in statistics["value_observations"]:
        lines.append(
            f"- {vo['tag']}: 관찰 {vo['observed_record_count']}회, "
            f"비율 {vo['observation_rate']}%, strength 합 {vo['strength_sum']}"
        )

    lines.append("")
    lines.append("최근 기록에서 덜 나타난 가치:")
    for lv in statistics["less_observed_values"]:
        lines.append(f"- {lv['tag']}: {lv['observation_rate']}%")

    lines.append("")
    lines.append("대표 기록:")
    for tag, records in statistics["representative_records"].items():
        lines.append(f"[{tag}]")
        for rec in records:
            lines.append(f"  - {rec['content']} (strength={rec['strength']})")

    lines.append("")
    lines.append("북극성 핵심 가치:")
    for cv in north_star_core_values:
        lines.append(f"- {cv['tag']} (weight={cv['weight']})")

    return "\n".join(lines)

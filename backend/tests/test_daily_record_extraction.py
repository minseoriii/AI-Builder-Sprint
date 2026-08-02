import pytest

from app.schemas.daily_record import (
    DailyRecordExtractionAIResponse,
    DimensionExtraction,
    DimensionStatus,
    NormalizedCandidate,
)
from app.services.daily_record_extraction import (
    correct_dimension_misclassification,
    validate_dimension_assignment,
    validate_extraction_evidence,
)

SCHOOL_DEV_TEXT = "학교에서 하루종일 개발해서 힘들다"


def _make_extraction(**dimensions: DimensionExtraction) -> DailyRecordExtractionAIResponse:
    defaults = {
        dim: DimensionExtraction(
            status=DimensionStatus.MISSING,
            raw_values=[],
            normalized_candidates=[],
            evidence=[],
        )
        for dim in ("PERSON", "PLACE", "ACTIVITY", "TIME", "EMOTION")
    }
    defaults.update(dimensions)
    return DailyRecordExtractionAIResponse(
        dimensions=defaults,
        missing_question_types=[],
    )


def test_corrects_school_in_person_to_place():
    """학교가 PERSON에 잘못 들어가면 PLACE로 이동하고 PERSON은 MISSING."""
    ai_result = _make_extraction(
        PERSON=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["학교"],
            normalized_candidates=[],
            evidence=["학교에서"],
        ),
        PLACE=DimensionExtraction(
            status=DimensionStatus.MISSING,
            raw_values=[],
            normalized_candidates=[],
            evidence=[],
        ),
        ACTIVITY=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["개발"],
            normalized_candidates=[NormalizedCandidate(tag="개발", score=1.0)],
            evidence=["개발"],
        ),
        TIME=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["하루종일"],
            normalized_candidates=[NormalizedCandidate(tag="하루종일", score=1.0)],
            evidence=["하루종일"],
        ),
        EMOTION=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["힘들다"],
            normalized_candidates=[NormalizedCandidate(tag="힘들어", score=0.95)],
            evidence=["힘들다"],
        ),
    )

    corrected = correct_dimension_misclassification(ai_result, SCHOOL_DEV_TEXT)

    assert corrected.dimensions["PERSON"].raw_values == []
    assert corrected.dimensions["PERSON"].status == DimensionStatus.MISSING
    assert "학교" in corrected.dimensions["PLACE"].raw_values
    assert corrected.dimensions["ACTIVITY"].raw_values == ["개발"]
    assert "PERSON" in corrected.missing_question_types


def test_rejects_developer_inferred_as_person():
    """개발자를 원문에 없이 PERSON에 넣으면 ACTIVITY로 이동."""
    ai_result = _make_extraction(
        PERSON=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["개발자"],
            normalized_candidates=[],
            evidence=["개발"],
        ),
        ACTIVITY=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["개발"],
            normalized_candidates=[NormalizedCandidate(tag="개발", score=1.0)],
            evidence=["개발"],
        ),
        EMOTION=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["힘들다"],
            normalized_candidates=[NormalizedCandidate(tag="힘들어", score=0.95)],
            evidence=["힘들다"],
        ),
    )

    corrected = correct_dimension_misclassification(ai_result, SCHOOL_DEV_TEXT)

    assert corrected.dimensions["PERSON"].raw_values == []
    assert "개발" in corrected.dimensions["ACTIVITY"].raw_values
    assert "PERSON" in corrected.missing_question_types


def test_splits_activity_and_emotion_compound():
    """'개발 힘들어'처럼 활동+감정이 섞이면 분리한다."""
    ai_result = _make_extraction(
        ACTIVITY=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["개발 힘들어"],
            normalized_candidates=[],
            evidence=["개발"],
        ),
        EMOTION=DimensionExtraction(
            status=DimensionStatus.MISSING,
            raw_values=[],
            normalized_candidates=[],
            evidence=[],
        ),
    )

    corrected = correct_dimension_misclassification(ai_result, "개발 힘들어")

    assert "개발" in corrected.dimensions["ACTIVITY"].raw_values
    assert "힘들어" in corrected.dimensions["EMOTION"].raw_values


def test_validate_dimension_assignment_rejects_place_in_person():
    ai_result = _make_extraction(
        PERSON=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["학교"],
            normalized_candidates=[],
            evidence=["학교에서"],
        ),
    )
    corrected = correct_dimension_misclassification(ai_result, SCHOOL_DEV_TEXT)
    validate_dimension_assignment(corrected, SCHOOL_DEV_TEXT)


def test_validate_dimension_assignment_raises_on_uncorrected_place_in_person():
    ai_result = _make_extraction(
        PERSON=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["학교"],
            normalized_candidates=[],
            evidence=["학교에서"],
        ),
    )
    with pytest.raises(ValueError, match="PERSON에 장소"):
        validate_dimension_assignment(ai_result, SCHOOL_DEV_TEXT)


def test_evidence_must_be_in_original():
    ai_result = _make_extraction(
        PERSON=DimensionExtraction(
            status=DimensionStatus.PRESENT,
            raw_values=["민서"],
            normalized_candidates=[NormalizedCandidate(tag="친구", score=0.9)],
            evidence=["민서랑"],
        ),
    )
    validate_extraction_evidence(ai_result, "민서랑 도서관에서 공부")
    bad = ai_result.model_copy(deep=True)
    bad.dimensions["PERSON"].evidence = ["없는구절"]
    with pytest.raises(ValueError):
        validate_extraction_evidence(bad, "민서랑 도서관에서 공부")

from pydantic import BaseModel


class TagsResponse(BaseModel):
    core_values: list[str]
    life_domains: list[str]
    sensory_tags: list[str]
    companion_types: list[str]

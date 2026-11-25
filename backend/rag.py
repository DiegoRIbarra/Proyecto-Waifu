import json
import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


TOKEN_PATTERN = re.compile(r"[a-z0-9]+", re.IGNORECASE)
STOP_WORDS = {
    "a", "al", "algo", "como", "con", "cual", "cuales", "de", "del", "donde",
    "el", "ella", "en", "es", "esta", "este", "hay", "la", "las", "lo", "los",
    "me", "mi", "para", "por", "que", "se", "sin", "su", "un", "una", "y",
}


@dataclass(frozen=True)
class Document:
    source: str
    title: str
    text: str


@dataclass(frozen=True)
class IndexedDocument:
    document: Document
    terms: Counter
    length: int


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def _tokens(text: str) -> list[str]:
    return [
        token for token in TOKEN_PATTERN.findall(_normalize(text))
        if token not in STOP_WORDS and len(token) > 1
    ]


def _split_markdown(text: str, source: str, max_chars: int = 1100) -> list[Document]:
    title_match = re.search(r"(?m)^#\s+(.+)$", text)
    title = title_match.group(1).strip() if title_match else Path(source).stem
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    documents: list[Document] = []
    current: list[str] = []
    current_size = 0

    for paragraph in paragraphs:
        if current and current_size + len(paragraph) > max_chars:
            documents.append(Document(source, title, "\n\n".join(current)))
            current = []
            current_size = 0
        current.append(paragraph)
        current_size += len(paragraph)

    if current:
        documents.append(Document(source, title, "\n\n".join(current)))
    return documents


def _flatten_json(value: object, path: str = "") -> list[str]:
    if isinstance(value, dict):
        lines: list[str] = []
        for key, child in value.items():
            lines.extend(_flatten_json(child, f"{path} {key}".strip()))
        return lines
    if isinstance(value, list):
        lines = []
        for child in value:
            lines.extend(_flatten_json(child, path))
        return lines
    if value is None:
        return []
    return [f"{path}: {value}"]


def _json_documents(value: object, source: str) -> list[Document]:
    title = Path(source).stem.replace("_", " ")
    if isinstance(value, dict):
        documents: list[Document] = []
        for key, child in value.items():
            if isinstance(child, list) and child and all(isinstance(item, dict) for item in child):
                for item in child:
                    documents.append(Document(source, title, "\n".join(_flatten_json({key: item}))))
            elif isinstance(child, dict):
                documents.append(Document(source, title, "\n".join(_flatten_json({key: child}))))
            elif not isinstance(child, list):
                documents.append(Document(source, title, "\n".join(_flatten_json({key: child}))))
        if documents:
            return documents
    return [Document(source, title, "\n".join(_flatten_json(value)))]


def load_documents(root: Path) -> list[Document]:
    documents: list[Document] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(root).as_posix()
        if path.suffix.lower() == ".md":
            documents.extend(_split_markdown(path.read_text(encoding="utf-8"), relative))
        elif path.suffix.lower() == ".json":
            parsed = json.loads(path.read_text(encoding="utf-8"))
            documents.extend(_json_documents(parsed, relative))
    return documents


class KnowledgeIndex:
    def __init__(self, documents: list[Document]):
        self.documents = [
            IndexedDocument(document, Counter(_tokens(document.text)), len(_tokens(document.text)))
            for document in documents
        ]
        self.average_length = (
            sum(document.length for document in self.documents) / len(self.documents)
            if self.documents else 0
        )

    def search(self, query: str, limit: int = 5) -> list[tuple[Document, float]]:
        query_terms = set(_tokens(query))
        if not query_terms or not self.documents:
            return []

        document_frequency = Counter(
            term
            for document in self.documents
            for term in set(document.terms)
        )
        total_documents = len(self.documents)
        ranked: list[tuple[Document, float]] = []

        for indexed in self.documents:
            score = 0.0
            for term in query_terms:
                frequency = indexed.terms.get(term, 0)
                if not frequency:
                    continue
                inverse_frequency = math.log(
                    1 + (total_documents - document_frequency[term] + 0.5)
                    / (document_frequency[term] + 0.5)
                )
                length_ratio = indexed.length / self.average_length if self.average_length else 0
                score += inverse_frequency * (
                    frequency * 2.5 / (frequency + 1.5 * (0.25 + 0.75 * length_ratio))
                )
            if score > 0:
                ranked.append((indexed.document, score))

        return sorted(ranked, key=lambda match: match[1], reverse=True)[:limit]

import unittest
from pathlib import Path

from backend.rag import KnowledgeIndex, load_documents


ROOT = Path(__file__).resolve().parents[2]


class KnowledgeIndexTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = KnowledgeIndex(load_documents(ROOT / "base-conocimiento"))

    def test_loads_markdown_and_structured_json(self):
        sources = {document.document.source for document in self.index.documents}
        self.assertIn("institucional/identidad-y-calidad.md", sources)
        self.assertIn("estructurados/profesores.json", sources)

    def test_retrieves_structured_professor_record(self):
        results = self.index.search("correo de Héctor Hugo Avilés Arriaga", limit=3)
        self.assertTrue(results)
        self.assertIn("Héctor Hugo Avilés Arriaga", results[0][0].text)

    def test_retrieves_campus_information_without_accent_match(self):
        results = self.index.search("direccion del campus de Ciudad Victoria", limit=3)
        self.assertTrue(results)
        self.assertTrue(any("TECNOTAM" in document.text for document, _score in results))

    def test_empty_or_unrelated_query_has_no_matches(self):
        self.assertEqual(self.index.search(""), [])
        self.assertEqual(self.index.search("zzqxv unrelatedtoken"), [])


if __name__ == "__main__":
    unittest.main()

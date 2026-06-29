import httpx
from typing import Optional
from app.config import settings

class AcademicServiceUnavailable(Exception):
    pass

class AcademicServiceClient:

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.ACADEMIC_SERVICE_URL

    def get_student(self, student_id: str, authorization: str) -> Optional[dict]:
        try:
            response = httpx.get(
                f"{self.base_url}/students/{student_id}",
                headers={"Authorization": authorization},
                timeout=5.0,
            )
        except httpx.RequestError as exc:
            raise AcademicServiceUnavailable(str(exc)) from exc

        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            raise AcademicServiceUnavailable(f"respuesta {response.status_code} de academic-service")

        return response.json()

academic_client = AcademicServiceClient()

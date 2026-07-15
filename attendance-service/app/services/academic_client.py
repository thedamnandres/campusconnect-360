import httpx

from app.config import settings


class AcademicServiceUnavailable(Exception):
    pass


class AcademicServiceClient:
    async def list_students(self, token: str) -> list:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{settings.ACADEMIC_SERVICE_URL}/students",
                    headers={"Authorization": f"Bearer {token}"},
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            raise AcademicServiceUnavailable(
                f"respuesta {exc.response.status_code} de academic-service"
            ) from exc
        except httpx.RequestError as exc:
            raise AcademicServiceUnavailable(str(exc)) from exc

    async def get_student(self, student_id: str, token: str) -> dict | None:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{settings.ACADEMIC_SERVICE_URL}/students/{student_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            raise AcademicServiceUnavailable(
                f"respuesta {exc.response.status_code} de academic-service"
            ) from exc
        except httpx.RequestError as exc:
            raise AcademicServiceUnavailable(str(exc)) from exc


academic_client = AcademicServiceClient()

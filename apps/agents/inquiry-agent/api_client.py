from typing import List

import requests

from config import Config
from graph_state import Inquiry


class SafeAIClient:
    def __init__(self, config: Config):
        self._base_url = config.safeai_api_base_url.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update(
            {"Authorization": f"Bearer {config.safeai_agent_api_token}"}
        )

    def fetch_open_inquiries(self) -> List[Inquiry]:
        # GET /contact/all now supports ?status= server-side (see
        # server/src/controllers/contactMessageController.ts:getAllRequests), but we still
        # filter client-side too in case this agent talks to an older server deployment
        # that hasn't picked up that change yet.
        response = self._session.get(f"{self._base_url}/contact/all", params={"status": "open"})
        response.raise_for_status()
        all_requests = response.json()
        return [
            {
                "id": item["_id"],
                "title": item["title"],
                "description": item["description"],
            }
            for item in all_requests
            if item.get("status") == "open"
        ]

    def post_reply(self, inquiry_id: str, text: str) -> None:
        response = self._session.post(
            f"{self._base_url}/contact/my-requests/{inquiry_id}/reply",
            json={"text": text},
        )
        response.raise_for_status()

    def mark_handled(self, inquiry_id: str) -> None:
        response = self._session.patch(
            f"{self._base_url}/contact/my-requests/{inquiry_id}/close"
        )
        response.raise_for_status()

    def update_classification(self, inquiry_id: str, category: str, urgency: str) -> None:
        """Persists this agent's classify_node output onto the ContactMessage itself
        (PATCH /contact/my-requests/:id/classification), so the admin's own request list
        shows the same urgency/category this agent used to sort and pick drafts - not just
        this process's in-memory `classified` dict, which disappears once the CLI exits.
        """
        response = self._session.patch(
            f"{self._base_url}/contact/my-requests/{inquiry_id}/classification",
            json={"category": category, "urgency": urgency},
        )
        response.raise_for_status()

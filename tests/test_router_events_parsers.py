from __future__ import annotations

import unittest

from ics_connect.errors import AppError
from ics_connect.validation import (
    parse_string_list,
    require_bool,
    require_int,
    require_str,
)


class TestEventParsers(unittest.TestCase):
    def test_require_str_error(self) -> None:
        with self.assertRaises(AppError):
            _ = require_str({}, "title")

    def test_require_bool_error(self) -> None:
        with self.assertRaises(AppError):
            _ = require_bool({"public": "yes"}, "public")

    def test_require_int_error(self) -> None:
        with self.assertRaises(AppError):
            _ = require_int({"capacity": "2"}, "capacity")

    def test_get_list_str_error(self) -> None:
        with self.assertRaises(AppError):
            _ = parse_string_list({"tags": [1, 2]}, "tags")

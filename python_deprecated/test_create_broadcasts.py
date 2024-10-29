import unittest

import create_broadcasts


class TestCreateBroadCast(unittest.TestCase):
    def test_clean_date(self):
        result = create_broadcasts.clean_date("Septemeber 15, 10:30 am")
        self.assertEqual("september 15, 10:30 am", result)


if __name__ == '__main__':
    unittest.main()

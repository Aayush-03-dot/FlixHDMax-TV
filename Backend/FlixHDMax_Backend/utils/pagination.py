from math import ceil


class Pagination:
    def __init__(self, page, per_page, total, items):
        self.page = page
        self.per_page = per_page
        self.total = total
        self.items = items
        self.pages = int(ceil(total / per_page)) if total > 0 else 0
        self.has_prev = self.page > 1
        self.prev_num = self.page - 1
        self.has_next = self.page < self.pages
        self.next_num = self.page + 1

    def iter_pages(self, left_edge=1, right_edge=1, left_current=1, right_current=2):
        last = 0

        for num in range(1, self.pages + 1):
            if (
                num <= left_edge
                or (self.page - left_current - 1 < num < self.page + right_current)
                or num > self.pages - right_edge
            ):
                if last + 1 != num:
                    yield None

                yield num
                last = num
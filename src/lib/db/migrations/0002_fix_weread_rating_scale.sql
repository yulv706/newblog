UPDATE `reading_books`
SET `rating` = CAST(ROUND(`rating` / 10.0) AS integer)
WHERE `source` = 'weread_book'
  AND `rating` > 50;

-- Add a function to update teacher_profiles when a new review is added
CREATE OR REPLACE FUNCTION update_teacher_rating_on_review()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  -- Calculate the new average rating and total reviews for the teacher
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(id)
  INTO 
    avg_rating,
    review_count
  FROM reviews
  WHERE teacher_id = NEW.teacher_id;

  -- Update the teacher_profiles table with the new stats
  UPDATE teacher_profiles
  SET 
    rating = ROUND(avg_rating, 1),
    total_reviews = review_count
  WHERE user_id = NEW.teacher_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_review_added_update_rating ON reviews;
CREATE TRIGGER on_review_added_update_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_teacher_rating_on_review();

def get_tmdb_movie_director(crew_data):
    for member in crew_data:
        if member.get("job") == "Director":
            return member.get("name")

    return None


def get_tmdb_top_actors(cast_data, count=10):
    actors = []

    for member in cast_data[:count]:
        if member.get("name"):
            actors.append({
                "name": member.get("name"),
                "profile_path": member.get("profile_path")
            })

    return actors
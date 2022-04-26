"""
mongo_db_utils.py | Author: Catherine Wong.
Utilities for working with MongoDB tables.
"""
import pymongo
import json

AUTH_USER = "user"
AUTH_PASSWORD = "password"


def open_db_connection(auth_file, db_table, mongo_url):
    with open(auth_file, "r") as f:
        auth_data = json.load(f)
        user, password = auth_data[AUTH_USER], auth_data[AUTH_PASSWORD]
    conn_str = mongo_url % (user, password, db_table)
    client = pymongo.MongoClient(conn_str)
    db = client[db_table]
    return db


#
# def all_experiment_records(experiment_id):
#     db = open_connection()
#     collection = db[experiment_id]
#     for record in collection.find({}):
#         yield record
#
#
# def record_exists(collection, data):
#     user_id = data["metadata"]["user_id"]
#     result = collection.find_one({"metadata.user_id": user_id})
#     if not result:
#         return False
#
#     if result["metadata"].get("completed"):
#         return True
#
#
# def record(data):
#     experiment_id = data["metadata"]["experiment_id"]
#     user_id = data["metadata"]["user_id"]
#     print(user_id)
#     if user_id == "admin":
#         experiment_id = "test"
#
#     db = open_connection()
#     collection = db[experiment_id]
#
#     if record_exists(collection, data):
#         return {"success": False, "message": "User already completed experiment"}
#
#     result = collection.replace_one({"metadata.user_id": user_id}, data, upsert=True)
#
#     print(result)
#
#     if result:
#         return {"success": True, "message": "Successfully updated record"}
#     else:
#         return {"sucess": False, "message": "Error updating record"}
#
#
# def update_record(user_id, experiment_id, data):
#     db = open_connection()
#     collection = db[experiment_id]
#     query = {"metadata.user_id": user_id}
#     update = {"$set": data}
#     result = collection.update_one(query, update)
#
#     print(result)
#
#     if result:
#         return {"success": True, "message": "Successfully updated record"}
#     else:
#         return {"sucess": False, "message": "Error updating record"}
#
#
# def get_record(user_id, experiment_id):
#     db = open_connection()
#     collection = db[experiment_id]
#     res = collection.find_one({"metadata.user_id": user_id})
#     return res

const express = require("express");
const movieController = require("../controllers/movieController");
const router = express.Router();

router.get("/home", movieController.getHomeFeed);
router.get("/catalog", movieController.getCatalog);
router.get("/collections", movieController.getCollections);
router.get("/collections/:slug", movieController.getCollectionBySlug);
router.get("/now-playing", movieController.getNowPlaying);
router.get("/popular", movieController.getPopular);
router.get("/search", movieController.search);
router.get("/:id/theatres", movieController.getTheatres);
router.get("/:id/season/:season", movieController.getSeason);
router.get("/:id", movieController.getDetails);

module.exports = router;

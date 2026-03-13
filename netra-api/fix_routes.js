module.exports = function() {
    const fs = require('fs');
    let text = fs.readFileSync('routes/potholeRoutes.js', 'utf8');

    const startIndex = text.indexOf('router.get("/live-frame"');
    if (startIndex === -1) return "Not found";
    
    // Find the end of the live-logs block which sits right before router.post("/analyze-video"
    const endIndex = text.indexOf('router.post("/analyze-video"');
    
    if (startIndex !== -1 && endIndex !== -1) {
        const block = text.substring(startIndex, endIndex);
        text = text.replace(block, "");
        
        text = text.replace('router.get("/:id", async (req, res, next) => {', block + 'router.get("/:id", async (req, res, next) => {');
        fs.writeFileSync('routes/potholeRoutes.js', text);
        return "Success";
    }
    return "Failed bounds";
}

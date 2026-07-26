document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ publish-app.js Loaded");

    const publishForm = document.getElementById("publishForm");

    if (!publishForm) {
        console.error("publishForm not found");
        return;
    }

    publishForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {

            alert("Publish Started");

        } catch (err) {

            console.error(err);

            alert(err.message);

        }

    });

});

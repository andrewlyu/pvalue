async function fetchValues() {
    const resultKey = document.getElementById('resultKey').value.trim();
    const resultsDiv = document.getElementById('results');
    
    // Clear previous results
    resultsDiv.innerHTML = '';
    
    // Check if input is empty
    if (!resultKey) {
        resultsDiv.innerHTML = '<div class="error-message">Please enter your key</div>';
        return;
    }
    
    // Show loading state
    resultsDiv.innerHTML = '<div class="loading">Loading values...</div>';
    
    try {
        const response = await fetch(`/api/values/${resultKey}`);
        const data = await response.json();
        
        if (response.ok && data.values) {
            // Generate HTML for values
            const valuesHtml = data.values.map(value => `
                <div class="value-item">
                    <div class="value-rank">${value.rank}</div>
                    <div class="value-content">
                        <div class="value-name">${value.name}</div>
                        <div class="value-description">${value.description}</div>
                    </div>
                </div>
            `).join('');
            
            resultsDiv.innerHTML = valuesHtml;
        } else {
            resultsDiv.innerHTML = `<div class="error-message">${data.error || 'Failed to fetch values'}</div>`;
        }
    } catch (error) {
        resultsDiv.innerHTML = '<div class="error-message">Error connecting to server</div>';
    }
}

// Add event listener for Enter key
document.getElementById('resultKey').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        fetchValues();
    }
}); 
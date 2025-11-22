import React from 'react';

const TestRender = () => {
    return (
        <div style={{ padding: '100px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>
            <h1>✅ SUCCESS: THE ROUTER IS WORKING!</h1>
            <p>The crash is in the Home component's dependencies (images or complex styles).</p>
        </div>
    );
};

export default TestRender;
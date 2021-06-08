export default function loadJS(url, main, location, tag){
    const scriptTag = document.createElement(tag);
    scriptTag.src = url;

    scriptTag.onload = main;
    scriptTag.onreadystatechange = main;

    location.appendChild(scriptTag);
};
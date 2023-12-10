export default function loadJS(tag, url, main){

    const scriptTag = document.createElement(tag);
    scriptTag.src = url;

    if(main) {
        scriptTag.onload = main;
        scriptTag.onreadystatechange = main;
    }

    document.body.appendChild(scriptTag);
};
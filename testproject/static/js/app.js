//read json
fetch('./static/js/data.json')
    .then((res) => res.json())
    .then(output => {
        workWithDom(processData(output))
    }
    )


function processData(data) {

    //get all params
    const allParams = {};
    /* 
     allParams = [];
     ....
     `const uniqueParams = [...new Set(allParams)]` would have been a better option,
     if there hadn`t been cases like "диагональ экрана (бортовой компьютер)" and "диагональ экрана"
    */
    //process each param of each object from json
    for (let key in data) {
        for (let subKey in data[key]) {

            //structure subkey data
            let ob = {
                "allValues": [data[key][subKey]],
                "min": null,
                "max": null,
                "objects": [
                    key
                ]
            };
            let trimmedSubkey = _.trim(subKey);
            // if there is an exact duplicate => add value and parent info 
            ['(', '`', "'", '['].forEach(sym => {
                if (_.includes(subKey, sym)) {
                    trimmedSubkey = _.trim(subKey.slice(0, (subKey.indexOf(sym))));
                }
            });
            if (allParams[trimmedSubkey]) {
                allParams[trimmedSubkey].allValues.push(ob.allValues[0]);
                allParams[trimmedSubkey].max = Math.max(...allParams[trimmedSubkey].allValues);
                allParams[trimmedSubkey].min = Math.min(...allParams[trimmedSubkey].allValues);
                allParams[trimmedSubkey].objects.push(ob.objects[0]);

            }
            // check duplicates like "диагональ экрана (бортовой компьютер)" and "диагональ экрана"
            else {
                findSubstringDuplicates(allParams, subKey, key, ob, data, trimmedSubkey)
            }

        };
    }

    function findSubstringDuplicates
        (allParams, subKeyToFind, parent, obByDefault, data, trimmedKey) {

        //check if there is case like  "диагональ экрана (бортовой компьютер)" and "диагональ экрана"
        for (let key in allParams) {
            if (compareStatement(key, subKeyToFind)) {
                let ob = {
                    "allValues": [allParams[key].allValues[0], data[parent][subKeyToFind]],
                    "min": Math.min(allParams[key].allValues[0], data[parent][subKeyToFind]),
                    "max": Math.max(allParams[key].allValues[0], data[parent][subKeyToFind]),
                    "objects": [
                        allParams[key].objects[0], parent
                    ]
                }
                let name;
                (key.length > subKeyToFind.length) ? name = subKeyToFind : name = key;
                delete allParams[key]
                allParams[name] = ob;
                return;
            }
        }
        // no duplicates 

        allParams[trimmedKey] = obByDefault;
    }

    function compareStatement(key1, key2) {

        ['(', '`', "'", '['].forEach(sym => {
            if (_.includes(key2, sym)) {
                let key1Sliced = _.trim(_.lowerCase(key1).slice(0, (key1.indexOf(sym))));
                let key2Sliced = _.trim(_.lowerCase(key2).slice(0, (key2.indexOf(sym))));
                return _.includes(key1Sliced, key2Sliced) || _.includes(key2Sliced, key1Sliced);
            }
        });

        return false
    }

    return allParams;
}

// ! work with dom
function workWithDom(finalData) {
    const ul = document.querySelector('#list');
    const dataList = document.querySelector('#data-list');

    //print params without duplicates
    for (let key in finalData) {
        ul.innerHTML += `
        <li class="li">
            <span class="checkbox" data-key="${key}"></span>
            ${key}
        </li>
        `;
    }

    const checkBoxes = Array.from(document.getElementsByClassName('checkbox'));
    checkBoxes.forEach(checkbox => {
        checkbox.addEventListener('click', () => {
            checkbox.classList.toggle('active');
            showSecondList();
        });
    });

    function showSecondList() {
        let toShow = []
        // write all checked options
        checkBoxes.forEach(check => {
            if (check.classList.contains('active')) {
                toShow.push(check.dataset.key)
            }
        });

        //more than 1 option
        if (toShow.length > 1) {
            dataList.innerHTML = ``;
            dataList.innerHTML += `
            <li>
                <div class="label">Список всех объектов, для которых хотя-бы 
                один параметр задан, от большего числа параметров:</div>
                <ul id="data-sublist">

                </ul>
            </li>`;

            const dataSubList = document.querySelector('#data-sublist');
            objListGetter(toShow).forEach(element => {
                dataSubList.innerHTML += `
                <li>
                    ${element[0]} (${element[1]})
                </li>
                `;
            });

            toShow.forEach(opt => {
                dataList.innerHTML += `
                <li class="data-list__label label">${opt}:</li>
                <li class="data-list__min">
                    Мин. значение: ${valueGetter(finalData[opt], "min")}
                </li>
                <li class="data-list__max">
                    Макс. значение: ${valueGetter(finalData[opt], "max")}
                </li>
                `
            });
        }
        // 1 option
        else if (toShow.length >= 1) {
            dataList.innerHTML = `
            <li>
                <div class="label">Список всех объектов, для которых параметр задан:</div>
                <ul id="data-sublist">

                </ul>
            </li>
            `
            const dataSubList = document.querySelector('#data-sublist');
            finalData[toShow[0]]["objects"].forEach(element => {
                dataSubList.innerHTML += `
                <li>
                    ${element}
                </li>
                `;
            });
            dataList.innerHTML += `
            <li class="data-list__label label">Значения параметра:</li>
            <li class="data-list__min">
                Мин. значение: ${valueGetter(finalData[toShow[0]], "min")}
            </li>
            <li class="data-list__max">
                Макс. значение: ${valueGetter(finalData[toShow[0]], "max")}
            </li>
            `;
            dataList.classList.add('shown')
        }
        // no options, clear list
        else {
            dataList.classList.remove('shown')
            setTimeout(() => {
                dataList.innerHTML = ''
            }, 150);
        }
    }

    // min / max getter
    function valueGetter(obj, valueType) {
        return (obj["allValues"].length > 1) ? obj[valueType] : obj["allValues"][0];
    }

    // returns sorted list of parents
    function objListGetter(listOfParams) {
        const allParents = [];
        const sortedParents = [];
        listOfParams.forEach(param => {
            allParents.push(...finalData[param].objects)
        });
        while (allParents.length > 0) {
            let child = allParents[0];
            let len = allParents.length;
            _.pull(allParents, child);
            len -= allParents.length;
            sortedParents.push([child, len])
        }

        return sortedParents.sort(function (a, b) {
            if (a[1] > b[1]) {
                return -1;
            }
            else if (a[1] < b[1]){
                return 1
            }
            else{
                return 0;
            }
        })
    }
}

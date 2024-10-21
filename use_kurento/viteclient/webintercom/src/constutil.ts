

export function getUserTopic(userName:string) {
    return "user/" + userName;
}

export function getUserNameFromTopic(topic:string) {
    return topic.replace("user/", "");
}
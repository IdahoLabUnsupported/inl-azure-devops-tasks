export interface JsonObject<T> {
    count: number;
    value: T[];
}

export interface NuGetPackage {
    id:             string;
    normalizedName: string;
    name:           string;
    protocolType:   string;
    url:            string;
    versions:       NuGetPackageVersion[];
    _links:         Links;
}

export interface NuGetPackageVersion {
    id:                string;
    normalizedVersion: string;
    version:           string;
    isLatest:          boolean;
    isListed?:         boolean;
    storageId:         string;
    views:             View[];
    publishDate:       Date;
}

export interface Links {
    self:     Link;
    feed:     Link;
    versions: Link;
}

export interface Link {
    href: string;
}

export interface View {
    id:   string;
    name: string;
    url:  null;
    type: string;
}
